import { Tool } from '../../../../agent/tools/Tool.js';
import { ToolDescriptor } from '../../../../agent/tools/ToolDescriptor.js';
import { ToolLifecycleState } from '../../../../agent/tools/ToolLifecycle.js';
import { ExecutionContext } from '../../../../agent/runtime/ExecutionContext.js';
import { txWithUser } from '../../../controllers/utils.js';

export class BaseToolAdapter implements Tool {
    constructor(private descriptor: ToolDescriptor, private executor: (input: any) => Promise<any>) {}
    getDescriptor(): ToolDescriptor { return this.descriptor; }
    getState(): ToolLifecycleState { return ToolLifecycleState.READY; }
    async initialize(): Promise<void> {}
    async execute(context: ExecutionContext, input: unknown): Promise<unknown> { return this.executor(input); }
    async cleanup(): Promise<void> {}
}

export class ToolExecutionAdapter {
    constructor(private payload: any, private sendEvent: (type: string, data: any) => void) {}

    createProposeKnowledgeTool(): Tool {
        const descriptor: ToolDescriptor = {
            metadata: { name: 'proposeKnowledge', version: '1.0.0', description: 'Propose a new knowledge memory node.' },
            schema: { inputSchema: { type: 'object', properties: { content: { type: 'string' }, reason: { type: 'string' } }, required: ['content', 'reason'] } },
            permissions: [],
            capabilities: []
        };
        
        return new BaseToolAdapter(descriptor, async (args: any) => {
            const { content, reason } = args;
            const { knowledgeProposals } = await import('../../../db/schema.js');
            await txWithUser(this.payload.id as string, async (tx: any) => {
                await tx.insert(knowledgeProposals).values({
                    userId: this.payload.id as string,
                    actionType: 'INSERT',
                    proposedContent: content,
                    reason: reason || 'AI Auto-Proposed',
                    status: 'PENDING'
                });
            });
            this.sendEvent('status', { message: `💡 AI auto-proposed a new knowledge memory! (Content length: ${content?.length || 0})` });
            this.sendEvent('system_event', { type: 'knowledge_proposal_created' });
            return { status: "success" };
        });
    }

    createExecuteCodeTool(): Tool {
        const descriptor: ToolDescriptor = {
            metadata: { name: 'execute_code', version: '1.0.0', description: 'Execute code in sandbox.' },
            schema: { inputSchema: { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string' } }, required: ['code', 'language'] } },
            permissions: [],
            capabilities: []
        };
        
        return new BaseToolAdapter(descriptor, async (args: any) => {
            const { code, language } = args;
            const langDisp = language || 'javascript';
            this.sendEvent('status', { message: `🚀 Sandbox Executing ${langDisp}...` });
            this.sendEvent('text', `\n\n\`\`\`${langDisp}\n${code}\n\`\`\`\n\n\`\`\`ansi\n`);
            
            const targetLang = (langDisp || 'javascript').toLowerCase();
            const judge0Langs = ['c', 'cpp', 'c++', 'csharp', 'cs', 'c#', 'rust', 'rs', 'go', 'php', 'ruby', 'rb', 'java', 'typescript', 'ts'];
            const judge0Aliases: Record<string, number> = {
                'c': 103, 'cpp': 105, 'c++': 105, 'csharp': 51, 'cs': 51, 'c#': 51,
                'typescript': 101, 'ts': 101, 'rust': 108, 'rs': 108, 'go': 107,
                'php': 98, 'ruby': 72, 'rb': 72, 'bash': 46, 'sh': 46,
                'javascript': 102, 'js': 102, 'python': 109, 'py': 109, 'java': 91
            };

            if (judge0Langs.includes(targetLang) || !process.env.E2B_API_KEY) {
                const judge0LangId = judge0Aliases[targetLang] || 102;
                try {
                    const judge0Res = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ language_id: judge0LangId, source_code: code })
                    });
                    const data = await judge0Res.json().catch(() => ({}));
                    if (!judge0Res.ok) {
                        const errMsg = data.error || `Judge0 execution failed (${judge0Res.status})`;
                        this.sendEvent('text', `\nExecution error: ${errMsg}\n\`\`\`\n\n`);
                        return { status: "error", error: errMsg };
                    }
                    let output = '';
                    if (data.compile_output) output += `Compilation Error:\n${data.compile_output}\n\n`;
                    output += data.stdout || "";
                    if (data.stderr) output += (output ? "\n" : "") + data.stderr;
                    if (data.message) output += (output ? "\n" : "") + data.message;
                    if (!output.trim()) output = "Code executed with no output.";
                    this.sendEvent('text', output);
                    this.sendEvent('text', `\n\`\`\`\n\n`);
                    return { status: "success", output };
                } catch (e: any) {
                    const errorText = `Execution failed: ${e.message}`;
                    this.sendEvent('text', errorText);
                    this.sendEvent('text', `\n\`\`\`\n\n`);
                    return { status: "error", error: errorText };
                }
            }

            let e2bModule;
            try { e2bModule = await import('@e2b/code-interpreter'); } 
            catch (e) { 
                const msg = `Sandbox library unavailable: ${(e as Error).message}`;
                this.sendEvent('text', msg + '\n\`\`\`\n\n');
                return { status: "error", error: msg };
            }
            const apiKey = process.env.E2B_API_KEY;
            if (!apiKey) {
                const msg = "E2B_API_KEY not configured.";
                this.sendEvent('text', msg + '\n\`\`\`\n\n');
                return { status: "error", error: msg };
            }

            const supportedLanguages = ['python', 'javascript', 'r', 'java', 'bash', 'c', 'cpp', 'php', 'ruby'];
            if (!supportedLanguages.includes(targetLang)) {
                const failMsg = `Language '${targetLang}' is not supported in remote sandbox. Supported: ${supportedLanguages.join(', ')}.`;
                this.sendEvent('text', failMsg + '\n\`\`\`\n\n');
                return { status: "error", error: failMsg };
            }

            let sandbox;
            let fullOutput = "";
            try {
                sandbox = await e2bModule.Sandbox.create({ apiKey });
                const execution = await sandbox.runCode(code, {
                    language: targetLang,
                    onStdout: (out: any) => { const text = out.line || out.text || out.toString(); fullOutput += text; this.sendEvent('text', text); },
                    onStderr: (out: any) => { const text = out.line || out.text || out.toString(); fullOutput += text; this.sendEvent('text', text); },
                    onResult: (res: any) => { const text = res.text ? res.text + "\n" : JSON.stringify(res) + "\n"; fullOutput += text; this.sendEvent('text', text); }
                });
                if (execution.error) {
                    const errorText = `\nError: ${execution.error.name} - ${execution.error.value}\n${execution.error.traceback}\n`;
                    fullOutput += errorText;
                    this.sendEvent('text', errorText);
                }
                this.sendEvent('text', `\n\`\`\`\n\n`);
                return { status: "success", output: fullOutput || "Code executed successfully with no output." };
            } catch (e: any) {
                const msg = `Sandbox execution error: ${e.message}`;
                this.sendEvent('text', msg + '\n\`\`\`\n\n');
                return { status: "error", error: msg };
            } finally {
                if (sandbox) await sandbox.kill().catch(() => {});
            }
        });
    }

    createReadGithubRepoTool(): Tool {
        const descriptor: ToolDescriptor = {
            metadata: { name: 'read_github_repo', version: '1.0.0', description: 'Read a GitHub repo.' },
            schema: { inputSchema: { type: 'object', properties: { repoUrl: { type: 'string' }, filesToRead: { type: 'array', items: { type: 'string' } } }, required: ['repoUrl'] } },
            permissions: [],
            capabilities: []
        };
        
        return new BaseToolAdapter(descriptor, async (args: any) => {
            const { repoUrl, filesToRead } = args || {};
            if (!repoUrl || typeof repoUrl !== 'string') {
                const err = "Please provide a valid GitHub repository URL (e.g., https://github.com/owner/repo).";
                this.sendEvent('text', `\n*GitHub operation notice: ${err}*\n`);
                return { status: "error", error: err };
            }
            this.sendEvent('status', { message: `🔍 Reading GitHub Repository: ${repoUrl}` });
            const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\s]+)/i);
            if (!match) {
                const err = `Invalid GitHub URL format: "${repoUrl}". Expected format: https://github.com/owner/repo`;
                this.sendEvent('text', `\n*GitHub operation notice: ${err}*\n`);
                return { status: "error", error: err };
            }
            const owner = match[1];
            const repo = match[2].replace(/\.git$/, '');
            
            try {
                const defaultBranchUrl = `https://api.github.com/repos/${owner}/${repo}`;
                const repoInfoRes = await fetch(defaultBranchUrl, { headers: { 'User-Agent': 'DevGenie-AI' }});
                if (!repoInfoRes.ok) {
                    const err = `Could not access GitHub repository ${owner}/${repo} (${repoInfoRes.status}). Please check that the repository is public and spelled correctly.`;
                    this.sendEvent('text', `\n*GitHub operation notice: ${err}*\n`);
                    return { status: "error", error: err };
                }
                const repoInfo = await repoInfoRes.json().catch(() => ({}));
                const defaultBranch = repoInfo.default_branch || 'main';
                
                let result: any = { status: "success", owner, repo, defaultBranch };
                if (!filesToRead || filesToRead.length === 0) {
                    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
                    const treeRes = await fetch(treeUrl, { headers: { 'User-Agent': 'DevGenie-AI' }});
                    if (!treeRes.ok) {
                        const err = `Could not fetch repository file tree (${treeRes.status}).`;
                        this.sendEvent('text', `\n*GitHub operation notice: ${err}*\n`);
                        return { status: "error", error: err };
                    }
                    const treeData = await treeRes.json().catch(() => ({ tree: [] }));
                    result.fileTree = (treeData.tree || []).map((node: any) => node.path).filter((p: string) => !p.startsWith('.git/'));
                } else {
                    result.fileContents = {};
                    for (const file of filesToRead) {
                        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file}`;
                        const rawRes = await fetch(rawUrl, { headers: { 'User-Agent': 'DevGenie-AI' }});
                        if (rawRes.ok) {
                            result.fileContents[file] = await rawRes.text();
                        } else {
                            result.fileContents[file] = `Error: File '${file}' does not exist in repository ${owner}/${repo} (HTTP ${rawRes.status}).`;
                        }
                    }
                }
                this.sendEvent('text', `\n*Successfully processed GitHub operation for ${repoUrl}*\n`);
                return result;
            } catch (err: any) {
                const errorMsg = `GitHub operation failed: ${err.message}`;
                this.sendEvent('text', `\n*GitHub operation notice: ${errorMsg}*\n`);
                return { status: "error", error: errorMsg };
            }
        });
    }
}
