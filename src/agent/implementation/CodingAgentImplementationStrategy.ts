import type {
  ImplementationStrategy,
  ImplementationContext,
  ImplementationResult,
  ToolExecutionRecord,
  ImplementationError
} from './ImplementationTypes.js';

export type LLMImplementationCaller = (
  prompt: string,
  systemPrompt?: string
) => Promise<string>;

export class CodingAgentImplementationStrategy implements ImplementationStrategy {
  public readonly name = 'CodingAgentImplementationStrategy';
  public readonly version = '1.0.0';

  constructor(private llmCaller?: LLMImplementationCaller) {}

  public async implement(context: ImplementationContext): Promise<ImplementationResult> {
    const startTime = Date.now();
    const maxIterations = context.maxIterations || 8;
    const toolCalls: ToolExecutionRecord[] = [];
    const errors: ImplementationError[] = [];
    const modifiedFiles = new Set<string>();
    const createdFiles = new Set<string>();
    const deletedFiles = new Set<string>();

    const goal = context.goal;
    const task = context.task;
    const planStep = context.planStep;
    const rawGoalText = `${goal.rawPrompt || ''} ${goal.title || ''} ${goal.description || ''} ${goal.desiredOutcome || ''} ${planStep.description || ''} ${task?.description || ''}`.trim();

    // 1. Initial Workspace Inspection: list directory
    let workspaceFiles: string[] = [];
    try {
      const listRes = await this.executeToolWithTracking(
        'list_dir',
        { DirectoryPath: '/' },
        context,
        toolCalls
      );
      if (listRes.success && (listRes.output as any)?.entries) {
        workspaceFiles = (listRes.output as any).entries.map((e: any) => e.path || e.name);
      }
    } catch {
      // workspace inspection warning, continue
    }

    // 2. Inspect relevant existing files if any
    const inspectedFiles: Record<string, string> = {};
    for (const filePath of workspaceFiles.slice(0, 5)) {
      if (filePath.endsWith('.py') || filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.json') || filePath.endsWith('.txt')) {
        try {
          const viewRes = await this.executeToolWithTracking(
            'view_file',
            { AbsolutePath: filePath },
            context,
            toolCalls
          );
          if (viewRes.success && (viewRes.output as any)?.content) {
            inspectedFiles[filePath] = String((viewRes.output as any).content);
          }
        } catch {
          // ignore
        }
      }
    }

    // 3. Execution reasoning loop
    let iteration = 0;
    let isComplete = false;

    // Check if LLM caller is available
    if (this.llmCaller) {
      while (iteration < maxIterations && !isComplete) {
        iteration++;
        try {
          const systemPrompt = `You are the CodingAgent for DevGenie.
Your job is to reason about the user's Goal and implement real, context-aware, production-ready code.
CRITICAL RULES:
1. Do NOT generate generic placeholder templates like 'def main(): print("Execution completed successfully.")'.
2. NEVER write real API keys or secrets in source code. Use environment variables (e.g., os.environ.get("GEMINI_API_KEY") or process.env.GEMINI_API_KEY) and create .env.example.
3. Make surgical edits to existing files; preserve unrelated code.
4. Output your plan as a JSON object with:
   {
     "reasoning": "string explaining what code changes you are making",
     "completed": boolean, // Set to true when you have finished making all required code or file changes for this task.
     "toolCalls": [
       { "toolName": "create_file" | "edit_file" | "delete_file" | "view_file" | "run_command", "input": { ... } }
     ],
     "summary": "string"
   }`;

          const userPrompt = `GOAL:
Title: ${goal.title || ''}
Description: ${goal.description || ''}
Outcome: ${goal.desiredOutcome || ''}
Full prompt: ${rawGoalText}

CURRENT TASK:
Title: ${planStep.title}
Description: ${planStep.description}

WORKSPACE FILES:
${workspaceFiles.join('\n') || '(empty workspace)'}

INSPECTED FILE CONTENTS:
${Object.entries(inspectedFiles).map(([p, c]) => `--- ${p} ---\n${c.slice(0, 1000)}`).join('\n\n')}

PREVIOUS ACTIONS & OUTPUTS IN THIS STEP:
${toolCalls.map(t => `[${t.toolName}] => ${t.success ? 'SUCCESS' : 'FAILED'}: ${JSON.stringify(t.output).slice(0, 300)}`).join('\n')}

Provide the next set of tool calls to implement the goal.`;

          const llmResponse = await this.llmCaller(userPrompt, systemPrompt);
          const parsed = this.parseLLMResponse(llmResponse);

          if (parsed && parsed.toolCalls && parsed.toolCalls.length > 0) {
            for (const call of parsed.toolCalls) {
              const res = await this.executeToolWithTracking(
                call.toolName,
                call.input,
                context,
                toolCalls
              );

              const targetPath = (call.input as any)?.TargetFile || (call.input as any)?.path || (call.input as any)?.filePath;
              if (res.success && targetPath) {
                if (call.toolName === 'create_file') {
                  createdFiles.add(targetPath);
                  if (context.onFileChanged) {
                    context.onFileChanged({ path: targetPath, action: 'create', actor: 'AGENT', taskId: planStep.id, executionId: context.executionContext.executionId, timestamp: Date.now() });
                  }
                } else if (call.toolName === 'edit_file' || call.toolName === 'multi_edit_file') {
                  modifiedFiles.add(targetPath);
                  if (context.onFileChanged) {
                    context.onFileChanged({ path: targetPath, action: 'edit', actor: 'AGENT', taskId: planStep.id, executionId: context.executionContext.executionId, timestamp: Date.now() });
                  }
                } else if (call.toolName === 'delete_file') {
                  deletedFiles.add(targetPath);
                  if (context.onFileChanged) {
                    context.onFileChanged({ path: targetPath, action: 'delete', actor: 'AGENT', taskId: planStep.id, executionId: context.executionContext.executionId, timestamp: Date.now() });
                  }
                }
              }
            }

            if (parsed.completed) {
              isComplete = true;
            }
          } else {
            // If LLM returned completed: true OR if tools were already executed successfully and LLM returned summary/no more tools
            if (parsed?.completed || (toolCalls.length > 0 && toolCalls.some(t => t.success))) {
              isComplete = true;
            }
            break;
          }
        } catch (err: unknown) {
          const rawMsg = (err as Error)?.message || String(err);
          let cleanMessage = rawMsg;

          // Parse any JSON error structures embedded in raw error strings
          if (cleanMessage.includes('{') && cleanMessage.includes('}')) {
            try {
              const start = cleanMessage.indexOf('{');
              const end = cleanMessage.lastIndexOf('}');
              const parsed = JSON.parse(cleanMessage.substring(start, end + 1));
              const inner = parsed?.error || parsed;
              if (inner?.message) {
                cleanMessage = `[${inner.code || 500} ${inner.status || 'ERROR'}] ${inner.message}`;
              }
            } catch {
              // use rawMsg
            }
          }

          const is503 = cleanMessage.includes('503') || cleanMessage.includes('high demand') || cleanMessage.includes('UNAVAILABLE');
          const isQuota = cleanMessage.toLowerCase().includes('quota') || cleanMessage.toLowerCase().includes('insufficient_quota');
          const isRateLimit = (cleanMessage.includes('429') || cleanMessage.includes('RESOURCE_EXHAUSTED') || cleanMessage.toLowerCase().includes('rate limit')) && !isQuota;
          const isAuth = cleanMessage.toLowerCase().includes('api key') || cleanMessage.toLowerCase().includes('api_key') || cleanMessage.includes('400') || cleanMessage.includes('401');

          errors.push({
            code: is503 ? 'MODEL_HIGH_DEMAND_503' : isQuota ? 'QUOTA_EXCEEDED_429' : isRateLimit ? 'RATE_LIMIT_429' : isAuth ? 'INVALID_API_KEY_400' : 'LLM_REASONING_ERROR',
            message: cleanMessage,
            recoverable: (is503 || isRateLimit) && !isQuota && !isAuth
          });

          // Quota and Auth errors are NOT recoverable by retrying - fail immediately
          if (isQuota || isAuth) {
            throw new Error(cleanMessage);
          }

          if ((is503 || isRateLimit) && iteration < 2) {
            const backoff = 1000 + Math.floor(Math.random() * 800);
            await new Promise((r) => setTimeout(r, backoff));
            continue;
          }

          throw new Error(cleanMessage);
        }
      }
    }

    // 4. If not completed via LLM, throw clean error
    if (!isComplete && toolCalls.length === 0) {
      if (errors.length > 0) {
        throw new Error(errors[errors.length - 1].message);
      }
      throw new Error("LLM could not generate valid tool calls for implementation. Iterations exhausted or failed.");
    }

    const hasMutation = createdFiles.size > 0 || modifiedFiles.size > 0 || deletedFiles.size > 0;
    const hasSuccessfulToolCalls = toolCalls.length > 0 && toolCalls.some(t => t.success);

    // If mutations occurred or tool calls succeeded, mark completion
    if (hasMutation || hasSuccessfulToolCalls) {
      isComplete = true;
    }

    const stepSuccess = (isComplete || hasMutation || hasSuccessfulToolCalls) && (hasSuccessfulToolCalls || errors.length === 0);

    return {
      success: stepSuccess,
      modifiedFiles: Array.from(modifiedFiles),
      createdFiles: Array.from(createdFiles),
      deletedFiles: Array.from(deletedFiles),
      toolCalls,
      verificationRequested: true,
      summary: `Successfully implemented code changes for task: ${planStep.title} (${createdFiles.size} created, ${modifiedFiles.size} modified).`
    };
  }

  private async executeToolWithTracking(
    toolName: string,
    input: unknown,
    context: ImplementationContext,
    toolCalls: ToolExecutionRecord[]
  ): Promise<{ success: boolean; output: unknown; error?: string }> {
    const callStart = Date.now();
    if (context.onProgress) {
      context.onProgress({
        type: 'tool_started',
        toolName,
        description: `Executing tool: ${toolName}`
      });
    }

    try {
      const toolResult = await context.pipeline.execute(
        toolName,
        input,
        context.executionContext
      );

      const record: ToolExecutionRecord = {
        toolName,
        input,
        output: toolResult.data || toolResult.error,
        success: toolResult.success,
        timestamp: Date.now(),
        durationMs: Date.now() - callStart,
        error: toolResult.error ? String(toolResult.error) : undefined
      };
      toolCalls.push(record);

      if (context.onProgress) {
        context.onProgress({
          type: 'tool_output',
          toolName,
          result: record.output,
          error: record.error
        });
      }

      return {
        success: toolResult.success,
        output: record.output,
        error: record.error
      };
    } catch (err: any) {
      const record: ToolExecutionRecord = {
        toolName,
        input,
        output: null,
        success: false,
        timestamp: Date.now(),
        durationMs: Date.now() - callStart,
        error: err.message || String(err)
      };
      toolCalls.push(record);
      return { success: false, output: null, error: record.error };
    }
  }

  private parseLLMResponse(response: string): { reasoning?: string; completed?: boolean; toolCalls?: Array<{ toolName: string; input: unknown }>; summary?: string } | null {
    if (!response || !response.trim()) return null;
    try {
      // 1. Try standard JSON extraction
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, response];
      const rawJson = (jsonMatch[1] || response).trim();
      const parsed = JSON.parse(rawJson);
      if (parsed && (parsed.toolCalls || parsed.reasoning || parsed.summary || parsed.completed !== undefined)) {
        return parsed;
      }
    } catch {
      // Fallback: try finding first '{' and last '}'
      const firstBrace = response.indexOf('{');
      const lastBrace = response.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          const candidate = response.substring(firstBrace, lastBrace + 1);
          const parsed = JSON.parse(candidate);
          if (parsed && (parsed.toolCalls || parsed.reasoning || parsed.summary || parsed.completed !== undefined)) {
            return parsed;
          }
        } catch {
          // Continue to multi-code block extraction
        }
      }
    }

    // 2. Extract ALL code blocks across multiple files
    const toolCalls: Array<{ toolName: string; input: any }> = [];
    const blockRegex = /(?:(?:\/\/\s*|#\s*|<!--\s*|\*\*\s*|###\s*)?(?:File(?:name)?|Path):\s*`?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)`?[\s\S]*?)?```([a-zA-Z0-9_-]+)?(?:\s+(?:filename|path|file)=["']?([a-zA-Z0-9_\-./\\]+)["']?)?\s*([\s\S]*?)```/gi;

    let match: RegExpExecArray | null;
    let blockIndex = 0;

    while ((match = blockRegex.exec(response)) !== null) {
      const explicitHeaderFile = match[1]?.trim();
      const lang = (match[2] || '').toLowerCase().trim();
      const explicitAttrFile = match[3]?.trim();
      const code = match[4]?.trim();

      if (!code) continue;

      // Also check if the first line of the code contains a filename comment
      let codeFirstLineFile = '';
      const firstLineMatch = code.match(/^(?:\/\/|#|\/\*|<!--)\s*(?:file(?:name)?:?\s*)?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)/i);
      if (firstLineMatch) {
        codeFirstLineFile = firstLineMatch[1].trim();
      }

      let detectedFile = explicitHeaderFile || explicitAttrFile || codeFirstLineFile;

      if (!detectedFile) {
        if (lang === 'python' || lang === 'py') {
          detectedFile = blockIndex === 0 ? 'solution.py' : blockIndex === 1 ? 'utils.py' : `module_${blockIndex}.py`;
        } else if (lang === 'typescript' || lang === 'ts' || lang === 'tsx') {
          detectedFile = blockIndex === 0 ? (lang === 'tsx' ? 'src/App.tsx' : 'index.ts') : `src/module_${blockIndex}.${lang === 'tsx' ? 'tsx' : 'ts'}`;
        } else if (lang === 'javascript' || lang === 'js' || lang === 'jsx') {
          detectedFile = blockIndex === 0 ? 'index.js' : `utils_${blockIndex}.js`;
        } else if (lang === 'html') {
          detectedFile = 'index.html';
        } else if (lang === 'css') {
          detectedFile = 'styles.css';
        } else if (lang === 'json') {
          detectedFile = blockIndex === 0 ? 'package.json' : `config_${blockIndex}.json`;
        } else if (lang === 'sh' || lang === 'bash') {
          detectedFile = 'run.sh';
        } else {
          detectedFile = `file_${blockIndex + 1}.txt`;
        }
      }

      toolCalls.push({
        toolName: 'create_file',
        input: {
          TargetFile: detectedFile,
          Content: code,
          path: detectedFile,
          content: code
        }
      });

      blockIndex++;
    }

    if (toolCalls.length > 0) {
      return {
        reasoning: `Extracted ${toolCalls.length} file implementation(s) from code blocks`,
        completed: true,
        toolCalls,
        summary: `Implemented ${toolCalls.map(t => t.input.TargetFile).join(', ')}`
      };
    }

    return null;
  }

}
