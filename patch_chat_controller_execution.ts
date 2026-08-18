import fs from 'fs';
const file = 'src/server/controllers/ChatController.ts';
let content = fs.readFileSync(file, 'utf8');

const targetImports = "import { PromptContextMapper } from '../services/agentIntegration/context/PromptContextMapper.js';";
const replacementImports = "import { PromptContextMapper } from '../services/agentIntegration/context/PromptContextMapper.js';\nimport { ExecutionIntegrationService } from '../services/agentIntegration/execution/ExecutionIntegrationService.js';";

content = content.replace(targetImports, replacementImports);

const targetBlock = `            if (fc.name === 'proposeKnowledge') {
              const { content, reason } = fc.args as any;
              try {
                const { knowledgeProposals } = await import('../db/schema.js');
                await txWithUser(payload.id as string, async (tx: any) => {
                  await tx.insert(knowledgeProposals).values({
                    userId: payload.id as string,
                    actionType: 'INSERT',
                    proposedContent: content,
                    reason: reason || 'AI Auto-Proposed',
                    status: 'PENDING'
                  });
                });
                sendEvent('status', { message: \`💡 AI auto-proposed a new knowledge memory! (Content length: \${content?.length || 0})\` });
                sendEvent('system_event', { type: 'knowledge_proposal_created' });
                toolResponses.push({ functionResponse: { name: fc.name, response: { status: "success" } } });
              } catch (err: any) {
                console.error('Failed to create AI knowledge proposal:', err);
                sendEvent('status', { message: \`⚠️ Output failed to propose knowledge memory.\` });
                toolResponses.push({ functionResponse: { name: fc.name, response: { status: "failed", error: err.message } } });
              }
            } else if (fc.name === 'execute_code') {
              const { code, language } = fc.args as any;
              const langDisp = language || 'javascript';
              sendEvent('status', { message: \`🚀 Sandbox Executing \${langDisp}...\` });
              sendEvent('text', \`\\n\\n\\\`\\\`\\\`\${langDisp}\\n\${code}\\n\\\`\\\`\\\`\\n\\n\\\`\\\`\\\`ansi\\n\`);
              
              const runCodeInE2BSandbox = async (codeToRun: string, lang: string): Promise<string> => {
                const targetLang = (lang || 'javascript').toLowerCase();
                const judge0Langs = ['c', 'cpp', 'c++', 'csharp', 'cs', 'c#', 'rust', 'rs', 'go', 'php', 'ruby', 'rb', 'java', 'typescript', 'ts'];
                
                const judge0Aliases: Record<string, number> = {
                  'c': 103, 'cpp': 105, 'c++': 105,
                  'csharp': 51, 'cs': 51, 'c#': 51,
                  'typescript': 101, 'ts': 101,
                  'rust': 108, 'rs': 108, 'go': 107,
                  'php': 98, 'ruby': 72, 'rb': 72, 
                  'bash': 46, 'sh': 46,
                  'javascript': 102, 'js': 102,
                  'python': 109, 'py': 109, 'java': 91
                };

                if (judge0Langs.includes(targetLang) || !process.env.E2B_API_KEY) {
                   try {
                     const judge0LangId = judge0Aliases[targetLang] || 102; // Default to JS if unknown
                     const judge0Res = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({
                         language_id: judge0LangId,
                         source_code: codeToRun
                       })
                     });
                     
                     const data = await judge0Res.json();
                     if (!judge0Res.ok) throw new Error(data.error || 'Judge0 execution failed');
                     
                     let output = '';
                     if (data.compile_output) {
                        output += \`Compilation Error:\\n\${data.compile_output}\\n\\n\`;
                     }
                     output += data.stdout || "";
                     if (data.stderr) {
                        output += (output ? "\\n" : "") + data.stderr;
                     }
                     if (data.message) {
                        output += (output ? "\\n" : "") + data.message;
                     }
                     if (!output.trim()) {
                        output = "Code executed successfully with no output.";
                     }
                     sendEvent('text', output);
                     sendEvent('text', \`\\n\\\`\\\`\\\`\\n\\n\`);
                     return output;
                   } catch (e: any) {
                     const errorText = \`Judge0 execution error: \${e.message}\\n\`;
                     sendEvent('text', errorText);
                     sendEvent('text', \`\\n\\\`\\\`\\\`\\n\\n\`);
                     return errorText;
                   }
                }

                let e2bModule;
                try {
                  e2bModule = await import('@e2b/code-interpreter');
                } catch (e) {
                  return \`Error: Sandbox library missing. \${(e as Error).message}\`;
                }
                const apiKey = process.env.E2B_API_KEY;
                if (!apiKey) return "Error: E2B_API_KEY not configured.";

                let sandbox;
                let fullOutput = "";
                
                try {
                  const supportedLanguages = ['python', 'javascript', 'r', 'java', 'bash', 'c', 'cpp', 'php', 'ruby'];
                  
                  if (!supportedLanguages.includes(targetLang)) {
                    const failMsg = \`Error: Language '\${targetLang}' is not supported in the remote sandbox by default. Supported languages are: \${supportedLanguages.join(', ')}.\`;
                    sendEvent('text', failMsg + '\\n');
                    return failMsg;
                  }

                  sandbox = await e2bModule.Sandbox.create({ apiKey });
                  const execution = await sandbox.runCode(codeToRun, { 
                    language: targetLang,
                    onStdout: (out: any) => { 
                       const text = out.line || out.text || out.toString();
                       fullOutput += text;
                       sendEvent('text', text);
                    },
                    onStderr: (out: any) => { 
                       const text = out.line || out.text || out.toString();
                       fullOutput += text;
                       sendEvent('text', text);
                    },
                    onResult: (res: any) => { 
                       const text = res.text ? res.text + "\\n" : JSON.stringify(res) + "\\n";
                       fullOutput += text;
                       sendEvent('text', text);
                    }
                  });
                  
                  if (execution.error) {
                     const errorText = \`\\nError: \${execution.error.name} - \${execution.error.value}\\n\${execution.error.traceback}\\n\`;
                     fullOutput += errorText;
                     sendEvent('text', errorText);
                  }
                  
                  sendEvent('text', \`\\n\\\`\\\`\\\`\\n\\n\`);
                  return fullOutput || "Code executed successfully with no output.";
                } catch (e: any) {
                  const errorText = \`Sandbox execution error: \${e.message}\\n\`;
                  sendEvent('text', errorText);
                  sendEvent('text', \`\\n\\\`\\\`\\\`\\n\\n\`);
                  return errorText;
                } finally {
                  if (sandbox) await sandbox.kill();
                }
              };

              try {
                const executionOutput = await runCodeInE2BSandbox(code, langDisp);
                toolResponses.push({ functionResponse: { name: fc.name, response: { status: "success", output: executionOutput } } });
              } catch (err: any) {
                toolResponses.push({ functionResponse: { name: fc.name, response: { status: "failed", error: err.message } } });
              }
            } else if (fc.name === 'read_github_repo') {
              const { repoUrl, filesToRead } = fc.args as any;
              sendEvent('status', { message: \`🔍 Reading GitHub Repository: \${repoUrl}\` });
              
              const fetchGithubRepo = async (url: string, files?: string[]): Promise<any> => {
                const match = url.match(/github\\.com\\/([^\\/]+)\\/([^\\/\\s]+)/i);
                if (!match) {
                   throw new Error("Invalid GitHub URL format.");
                }
                const owner = match[1];
                const repo = match[2].replace(/\\.git$/, '');
                
                try {
                  const defaultBranchUrl = \`https://api.github.com/repos/\${owner}/\${repo}\`;
                  const repoInfoRes = await fetch(defaultBranchUrl, { headers: { 'User-Agent': 'DevGenie-AI' }});
                  if (!repoInfoRes.ok) throw new Error("Could not fetch repo info. Ensure it is public.");
                  const repoInfo = await repoInfoRes.json();
                  const defaultBranch = repoInfo.default_branch || 'main';
                  
                  let result: any = { status: "success", owner, repo, defaultBranch };
                  
                  if (!files || files.length === 0) {
                     const treeUrl = \`https://api.github.com/repos/\${owner}/\${repo}/git/trees/\${defaultBranch}?recursive=1\`;
                     const treeRes = await fetch(treeUrl, { headers: { 'User-Agent': 'DevGenie-AI' }});
                     if (!treeRes.ok) throw new Error("Could not fetch file tree.");
                     const treeData = await treeRes.json();
                     result.fileTree = treeData.tree.map((node: any) => node.path).filter((p: string) => !p.startsWith('.git/'));
                  } else {
                     result.fileContents = {};
                     for (const file of files) {
                        const rawUrl = \`https://raw.githubusercontent.com/\${owner}/\${repo}/\${defaultBranch}/\${file}\`;
                        const rawRes = await fetch(rawUrl, { headers: { 'User-Agent': 'DevGenie-AI' }});
                        if (rawRes.ok) {
                           result.fileContents[file] = await rawRes.text();
                        } else {
                           result.fileContents[file] = \`Error: Could not read file \${file}. (\${rawRes.status})\`;
                        }
                     }
                  }
                  
                  return result;
                } catch (e: any) {
                  return { status: "error", error: e.message };
                }
              };

              try {
                const fetchResult = await fetchGithubRepo(repoUrl, filesToRead);
                toolResponses.push({ functionResponse: { name: fc.name, response: fetchResult } });
                sendEvent('text', \`\\n*Successfully processed GitHub operation for \${repoUrl}*\\n\`);
              } catch (err: any) {
                toolResponses.push({ functionResponse: { name: fc.name, response: { status: "failed", error: err.message } } });
                sendEvent('text', \`\\n*Failed to read \${repoUrl}: \${err.message}*\\n\`);
              }
            } else {
              toolResponses.push({ functionResponse: { name: fc.name, response: { status: "success" } } });
            }`;

const replacementBlock = `            if (AgentFeatureFlags.USE_EXECUTION_PIPELINE) {
                try {
                    const execIntegration = new ExecutionIntegrationService();
                    await execIntegration.registerProductionTools(payload, sendEvent);
                    const result = await execIntegration.executeTool(fc.name, fc.args);
                    toolResponses.push({ functionResponse: { name: fc.name, response: result } });
                } catch (err: any) {
                    console.error(\`[ExecutionPipeline] Error executing \${fc.name}:\`, err);
                    toolResponses.push({ functionResponse: { name: fc.name, response: { status: "failed", error: err.message } } });
                }
            } else {
                ${targetBlock.replace(/\$/g, '$$$$')}
            }`;

const index = content.indexOf(targetBlock);
if (index === -1) {
    console.error("COULD NOT FIND TARGET BLOCK!");
} else {
    content = content.replace(targetBlock, replacementBlock);
    fs.writeFileSync(file, content);
    console.log("Patched correctly!");
}
