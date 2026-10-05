import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { Tool } from '../../../../agent/tools/Tool.js';
import { ToolDescriptor } from '../../../../agent/tools/ToolDescriptor.js';
import { ToolLifecycleState } from '../../../../agent/tools/ToolLifecycle.js';
import { ExecutionContext } from '../../../../agent/runtime/ExecutionContext.js';
import { txWithUser } from '../../../controllers/utils.js';
import { globalWorkspaceService } from '../../workspace/WorkspaceService.js';
import { activeCommandRegistry } from '../../../workspace/activeCommandRegistry.js';
import { di } from '../../../di.js';
import { TerminalEventData } from '../../../../agent/session/AgentSessionEvents.js';

function isLocalPath(p?: string): boolean {
    if (!p) return false;
    return path.isAbsolute(p) || p.startsWith('.') || fs.existsSync(p);
}

export class BaseToolAdapter implements Tool {
    constructor(private descriptor: ToolDescriptor, private executor: (input: any, context: ExecutionContext) => Promise<any>) {}
    getDescriptor(): ToolDescriptor { return this.descriptor; }
    getState(): ToolLifecycleState { return ToolLifecycleState.READY; }
    async initialize(): Promise<void> {}
    async execute(context: ExecutionContext, input: unknown): Promise<unknown> { return this.executor(input, context); }
    async cleanup(): Promise<void> {}
}

export class ToolExecutionAdapter {
    constructor(private payload: any = {}, private sendEvent: (type: string, data: any) => void = () => {}) {}

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

            // Native execution for Python, Node/JS, and Shell
            if (targetLang === 'python' || targetLang === 'py' || targetLang === 'javascript' || targetLang === 'js' || targetLang === 'bash' || targetLang === 'sh') {
                try {
                    const os = await import('os');
                    const fs = await import('fs');
                    const path = await import('path');
                    const { exec } = await import('child_process');

                    const tempDir = path.join(os.tmpdir(), `devgenie_exec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
                    fs.mkdirSync(tempDir, { recursive: true });

                    let filename = 'script.js';
                    let runCmd = `node "${filename}"`;
                    if (targetLang === 'python' || targetLang === 'py') {
                        filename = 'script.py';
                        runCmd = `python3 "${filename}"`;
                    } else if (targetLang === 'bash' || targetLang === 'sh') {
                        filename = 'script.sh';
                        runCmd = `bash "${filename}"`;
                    }

                    const scriptPath = path.join(tempDir, filename);
                    fs.writeFileSync(scriptPath, code, 'utf-8');

                    const execPromise = new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
                        exec(runCmd, { cwd: tempDir, timeout: 20000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
                            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
                            resolve({
                                stdout: stdout || '',
                                stderr: stderr || (error && !stdout ? `Error: ${error.message}\n` : ''),
                                exitCode: error ? (error.code ?? 1) : 0
                            });
                        });
                    });

                    const res = await execPromise;
                    let fullOutput = res.stdout;
                    if (res.stderr) {
                        fullOutput += (fullOutput ? '\n' : '') + res.stderr;
                    }
                    if (!fullOutput.trim()) {
                        fullOutput = 'Code executed successfully with no output.';
                    }

                    this.sendEvent('text', fullOutput);
                    this.sendEvent('text', `\n\`\`\`\n\n`);
                    return { status: res.exitCode === 0 ? 'success' : 'error', output: fullOutput, exitCode: res.exitCode };
                } catch (localErr: any) {
                    console.warn('[ToolExecutionAdapter] Local execution error, attempting remote fallback:', localErr);
                }
            }

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

    createViewFileTool(workspaceId?: string): Tool {
        const descriptor: ToolDescriptor = {
            metadata: { name: 'view_file', version: '1.0.0', description: 'Read a file from workspace' },
            schema: { inputSchema: { type: 'object', properties: { filePath: { type: 'string' }, TargetFile: { type: 'string' }, AbsolutePath: { type: 'string' }, StartLine: { type: 'number' }, EndLine: { type: 'number' } } } },
            permissions: [],
            capabilities: []
        };
        return new BaseToolAdapter(descriptor, async (args: any, context: ExecutionContext) => {
            const targetPath = args?.filePath || args?.TargetFile || args?.AbsolutePath || args?.path;
            if (!targetPath) {
                return { status: "error", error: "Missing filePath or TargetFile parameter" };
            }
            const wsId = workspaceId || context.workspaceId || context.workspaceRef?.id;
            const userId = this.payload?.id || 'default_user';
            this.sendEvent('status', { message: `📖 Reading file: ${targetPath}` });

            if (isLocalPath(wsId)) {
                try {
                    const resolvedPath = path.isAbsolute(targetPath) ? targetPath : path.resolve(wsId!, targetPath);
                    if (!fs.existsSync(resolvedPath)) {
                        return { status: "error", error: `File not found: ${targetPath}`, exists: false, content: "" };
                    }
                    let content = fs.readFileSync(resolvedPath, 'utf-8');
                    const stat = fs.statSync(resolvedPath);
                    if (args?.StartLine !== undefined || args?.EndLine !== undefined) {
                        const lines = content.split('\n');
                        const start = Math.max(1, args.StartLine ?? 1);
                        const end = args.EndLine ? Math.min(lines.length, args.EndLine) : lines.length;
                        content = lines.slice(start - 1, end).join('\n');
                    }
                    return {
                        status: "success",
                        path: targetPath,
                        name: path.basename(resolvedPath),
                        content,
                        size: stat.size,
                        exists: true
                    };
                } catch (err: any) {
                    return { status: "error", error: err.message, exists: false, content: "" };
                }
            }

            try {
                const file = await globalWorkspaceService.readFile(userId, wsId, targetPath);
                let content = file.content;
                if (args?.StartLine !== undefined || args?.EndLine !== undefined) {
                    const lines = content.split('\n');
                    const start = Math.max(1, args.StartLine ?? 1);
                    const end = args.EndLine ? Math.min(lines.length, args.EndLine) : lines.length;
                    content = lines.slice(start - 1, end).join('\n');
                }
                return {
                    status: "success",
                    path: file.path,
                    name: file.name,
                    content,
                    size: file.size,
                    language: file.language,
                    exists: true
                };
            } catch (err: any) {
                return { status: "error", error: err.message, exists: false, content: "" };
            }
        });
    }

    createCreateFileTool(workspaceId?: string): Tool {
        const descriptor: ToolDescriptor = {
            metadata: { name: 'create_file', version: '1.0.0', description: 'Create a new file in workspace' },
            schema: { inputSchema: { type: 'object', properties: { TargetFile: { type: 'string' }, filePath: { type: 'string' }, Content: { type: 'string' }, content: { type: 'string' } } } },
            permissions: [],
            capabilities: []
        };
        return new BaseToolAdapter(descriptor, async (args: any, context: ExecutionContext) => {
            const targetPath = args?.TargetFile || args?.filePath || args?.path;
            if (!targetPath) {
                return { status: "error", error: "Missing TargetFile or filePath parameter" };
            }
            const content = args?.Content ?? args?.content ?? "";
            const wsId = workspaceId || context.workspaceId || context.workspaceRef?.id;
            const userId = this.payload?.id || 'default_user';
            this.sendEvent('status', { message: `📝 Creating file: ${targetPath}` });

            if (isLocalPath(wsId)) {
                try {
                    const resolvedPath = path.isAbsolute(targetPath) ? targetPath : path.resolve(wsId!, targetPath);
                    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
                    fs.writeFileSync(resolvedPath, String(content), 'utf-8');
                    const stat = fs.statSync(resolvedPath);

                    const effSessionId = this.payload?.sessionId || context?.sessionId;
                    const effExecutionId = this.payload?.executionId || context?.executionId;
                    if (effSessionId && wsId) {
                        try {
                            await di.changeSetService.recordFileMutation({
                                sessionId: effSessionId,
                                workspaceId: wsId,
                                executionId: effExecutionId,
                                path: targetPath,
                                operation: 'CREATE',
                                beforeContent: '',
                                afterContent: String(content)
                            });
                        } catch (e) {
                            console.warn('[ToolExecutionAdapter] Failed to record changeSet for create_file:', e);
                        }
                    }

                    return {
                        status: "success",
                        path: targetPath,
                        size: stat.size,
                        created: true
                    };
                } catch (err: any) {
                    return { status: "error", error: err.message };
                }
            }

            try {
                const saved = await globalWorkspaceService.writeFile(
                    userId,
                    wsId,
                    targetPath,
                    String(content),
                    'AGENT',
                    { taskId: context.taskId, executionId: context.executionId }
                );

                const effSessionId = this.payload?.sessionId || context?.sessionId;
                const effExecutionId = this.payload?.executionId || context?.executionId;
                if (effSessionId && wsId) {
                    try {
                        await di.changeSetService.recordFileMutation({
                            sessionId: effSessionId,
                            workspaceId: wsId,
                            executionId: effExecutionId,
                            path: targetPath,
                            operation: 'CREATE',
                            beforeContent: '',
                            afterContent: String(content)
                        });
                    } catch (e) {
                        console.warn('[ToolExecutionAdapter] Failed to record changeSet for create_file:', e);
                    }
                }

                return {
                    status: "success",
                    path: saved.path,
                    size: saved.size,
                    created: true
                };
            } catch (err: any) {
                return { status: "error", error: err.message };
            }
        });
    }

    createEditFileTool(workspaceId?: string): Tool {
        const descriptor: ToolDescriptor = {
            metadata: { name: 'edit_file', version: '1.0.0', description: 'Edit or modify a file in workspace' },
            schema: { inputSchema: { type: 'object', properties: { TargetFile: { type: 'string' }, filePath: { type: 'string' }, TargetContent: { type: 'string' }, ReplacementContent: { type: 'string' }, Content: { type: 'string' }, instruction: { type: 'string' } } } },
            permissions: [],
            capabilities: []
        };
        return new BaseToolAdapter(descriptor, async (args: any, context: ExecutionContext) => {
            const targetPath = args?.TargetFile || args?.filePath || args?.path;
            if (!targetPath) {
                return { status: "error", error: "Missing TargetFile or filePath parameter" };
            }
            const wsId = workspaceId || context.workspaceId || context.workspaceRef?.id;
            const userId = this.payload?.id || 'default_user';
            this.sendEvent('status', { message: `✏️ Editing file: ${targetPath}` });

            const targetContent = args?.TargetContent ?? args?.targetContent;
            const replacementContent = args?.ReplacementContent ?? args?.replacementContent;

            if (isLocalPath(wsId)) {
                try {
                    const resolvedPath = path.isAbsolute(targetPath) ? targetPath : path.resolve(wsId!, targetPath);
                    if (!fs.existsSync(resolvedPath)) {
                        return { status: "error", error: `File not found: ${targetPath}` };
                    }
                    const beforeContent = fs.readFileSync(resolvedPath, 'utf-8');
                    let content = beforeContent;
                    if (targetContent !== undefined && replacementContent !== undefined) {
                        if (!content.includes(targetContent)) {
                            return { status: "error", error: `TargetContent not found in file: ${targetPath}` };
                        }
                        content = content.replace(targetContent, replacementContent);
                    } else if (args?.Content !== undefined || args?.content !== undefined) {
                        content = String(args?.Content ?? args?.content);
                    }
                    fs.writeFileSync(resolvedPath, content, 'utf-8');
                    const stat = fs.statSync(resolvedPath);

                    const effSessionId = this.payload?.sessionId || context?.sessionId;
                    const effExecutionId = this.payload?.executionId || context?.executionId;
                    if (effSessionId && wsId) {
                        try {
                            await di.changeSetService.recordFileMutation({
                                sessionId: effSessionId,
                                workspaceId: wsId,
                                executionId: effExecutionId,
                                path: targetPath,
                                operation: 'MODIFY',
                                beforeContent,
                                afterContent: content,
                                metadata: { instruction: args?.instruction }
                            });
                        } catch (e) {
                            console.warn('[ToolExecutionAdapter] Failed to record changeSet for edit_file:', e);
                        }
                    }

                    return {
                        status: "success",
                        path: targetPath,
                        modified: true,
                        size: stat.size
                    };
                } catch (err: any) {
                    return { status: "error", error: err.message };
                }
            }

            try {
                const existing = await globalWorkspaceService.readFile(userId, wsId, targetPath);
                const beforeContent = existing.content;
                let newContent = existing.content;

                if (targetContent !== undefined && replacementContent !== undefined) {
                    if (!newContent.includes(targetContent)) {
                        return { status: "error", error: `TargetContent not found in file: ${targetPath}` };
                    }
                    newContent = newContent.replace(targetContent, replacementContent);
                } else if (args?.Content !== undefined || args?.content !== undefined) {
                    newContent = String(args?.Content ?? args?.content);
                }

                const saved = await globalWorkspaceService.writeFile(
                    userId,
                    wsId,
                    targetPath,
                    newContent,
                    'AGENT',
                    { taskId: context.taskId, executionId: context.executionId }
                );

                const effSessionId = this.payload?.sessionId || context?.sessionId;
                const effExecutionId = this.payload?.executionId || context?.executionId;
                if (effSessionId && wsId) {
                    try {
                        await di.changeSetService.recordFileMutation({
                            sessionId: effSessionId,
                            workspaceId: wsId,
                            executionId: effExecutionId,
                            path: targetPath,
                            operation: 'MODIFY',
                            beforeContent,
                            afterContent: newContent,
                            metadata: { instruction: args?.instruction }
                        });
                    } catch (e) {
                        console.warn('[ToolExecutionAdapter] Failed to record changeSet for edit_file:', e);
                    }
                }

                return {
                    status: "success",
                    path: saved.path,
                    modified: true,
                    size: saved.size
                };
            } catch (err: any) {
                return { status: "error", error: err.message };
            }
        });
    }

    createDeleteFileTool(workspaceId?: string): Tool {
        const descriptor: ToolDescriptor = {
            metadata: { name: 'delete_file', version: '1.0.0', description: 'Delete a file in workspace' },
            schema: { inputSchema: { type: 'object', properties: { TargetFile: { type: 'string' }, filePath: { type: 'string' } } } },
            permissions: [],
            capabilities: []
        };
        return new BaseToolAdapter(descriptor, async (args: any, context: ExecutionContext) => {
            const targetPath = args?.TargetFile || args?.filePath || args?.path;
            if (!targetPath) {
                return { status: "error", error: "Missing TargetFile or filePath parameter" };
            }
            const wsId = workspaceId || context.workspaceId || context.workspaceRef?.id;
            const userId = this.payload?.id || 'default_user';
            this.sendEvent('status', { message: `🗑️ Deleting file: ${targetPath}` });

            if (isLocalPath(wsId)) {
                try {
                    const resolvedPath = path.isAbsolute(targetPath) ? targetPath : path.resolve(wsId!, targetPath);
                    let beforeContent = '';
                    if (fs.existsSync(resolvedPath)) {
                        beforeContent = fs.readFileSync(resolvedPath, 'utf-8');
                        fs.unlinkSync(resolvedPath);
                    }

                    const effSessionId = this.payload?.sessionId || context?.sessionId;
                    const effExecutionId = this.payload?.executionId || context?.executionId;
                    if (effSessionId && wsId) {
                        try {
                            await di.changeSetService.recordFileMutation({
                                sessionId: effSessionId,
                                workspaceId: wsId,
                                executionId: effExecutionId,
                                path: targetPath,
                                operation: 'DELETE',
                                beforeContent,
                                afterContent: ''
                            });
                        } catch (e) {
                            console.warn('[ToolExecutionAdapter] Failed to record changeSet for delete_file:', e);
                        }
                    }

                    return {
                        status: "success",
                        path: targetPath,
                        deleted: true
                    };
                } catch (err: any) {
                    return { status: "error", error: err.message };
                }
            }

            try {
                let beforeContent = '';
                try {
                    const ex = await globalWorkspaceService.readFile(userId, wsId, targetPath);
                    beforeContent = ex.content;
                } catch {}

                const res = await globalWorkspaceService.deleteFile(userId, wsId, targetPath, 'AGENT');

                const effSessionId = this.payload?.sessionId || context?.sessionId;
                const effExecutionId = this.payload?.executionId || context?.executionId;
                if (effSessionId && wsId) {
                    try {
                        await di.changeSetService.recordFileMutation({
                            sessionId: effSessionId,
                            workspaceId: wsId,
                            executionId: effExecutionId,
                            path: targetPath,
                            operation: 'DELETE',
                            beforeContent,
                            afterContent: ''
                        });
                    } catch (e) {
                        console.warn('[ToolExecutionAdapter] Failed to record changeSet for delete_file:', e);
                    }
                }

                return {
                    status: "success",
                    path: res.path,
                    deleted: true
                };
            } catch (err: any) {
                return { status: "error", error: err.message };
            }
        });
    }

    createListDirTool(workspaceId?: string): Tool {
        const descriptor: ToolDescriptor = {
            metadata: { name: 'list_dir', version: '1.0.0', description: 'List files in workspace directory' },
            schema: { inputSchema: { type: 'object', properties: { DirectoryPath: { type: 'string' }, dirPath: { type: 'string' }, path: { type: 'string' } } } },
            permissions: [],
            capabilities: []
        };
        return new BaseToolAdapter(descriptor, async (args: any, context: ExecutionContext) => {
            const dirPath = args?.DirectoryPath || args?.dirPath || args?.path || '.';
            const wsId = workspaceId || context.workspaceId || context.workspaceRef?.id;
            const userId = this.payload?.id || 'default_user';
            this.sendEvent('status', { message: `📁 Listing directory: ${dirPath || '/'}` });

            if (isLocalPath(wsId)) {
                try {
                    const resolvedDir = path.isAbsolute(dirPath) ? dirPath : path.resolve(wsId!, dirPath);
                    if (!fs.existsSync(resolvedDir)) {
                        return { status: "error", error: `Directory not found: ${dirPath}` };
                    }
                    const dirents = fs.readdirSync(resolvedDir, { withFileTypes: true });
                    const entries = dirents.map(d => {
                        const full = path.join(resolvedDir, d.name);
                        let size = 0;
                        try { size = fs.statSync(full).size; } catch {}
                        return {
                            name: d.name,
                            path: path.relative(wsId!, full),
                            isDirectory: d.isDirectory(),
                            size
                        };
                    });
                    return {
                        status: "success",
                        path: dirPath,
                        entries,
                        total: entries.length
                    };
                } catch (err: any) {
                    return { status: "error", error: err.message };
                }
            }

            try {
                const listing = await globalWorkspaceService.listFiles(userId, wsId, dirPath);
                return {
                    status: "success",
                    path: listing.path,
                    entries: listing.entries,
                    total: listing.total
                };
            } catch (err: any) {
                return { status: "error", error: err.message };
            }
        });
    }

    createRunCommandTool(workspaceId?: string): Tool {
        const descriptor: ToolDescriptor = {
            metadata: { name: 'run_command', version: '1.0.0', description: 'Execute a terminal command in workspace' },
            schema: { inputSchema: { type: 'object', properties: { CommandLine: { type: 'string' }, command: { type: 'string' }, Cwd: { type: 'string' }, cwd: { type: 'string' } } } },
            permissions: [],
            capabilities: []
        };
        return new BaseToolAdapter(descriptor, async (args: any, context: ExecutionContext) => {
            const command = args?.CommandLine || args?.command;
            if (!command) {
                return { status: "error", error: "Missing CommandLine or command parameter" };
            }
            const wsId = workspaceId || context.workspaceId || context.workspaceRef?.id;
            const userId = this.payload?.id || 'default_user';
            const cwd = args?.Cwd || args?.cwd;
            const timeoutMs = args?.WaitMsBeforeAsync || args?.timeoutMs || 30000;
            const executionId = context.executionId || (context as any)?.id || (this.payload as any)?.executionId;
            const sessionId = (context as any)?.sessionId || (this.payload as any)?.sessionId;

            this.sendEvent('status', { message: `💻 Running command: ${command}` });

            const emitTerminal = (data: TerminalEventData): void => {
                if (sessionId) {
                    try {
                        di.agentSessionService.emitSessionEvent({
                            type: 'terminal_event',
                            sessionId,
                            executionId,
                            workspaceId: wsId,
                            timestamp: Date.now(),
                            data: {
                                ...data,
                                command,
                                executionId
                            }
                        });
                    } catch {
                        // Ignore event emission failures
                    }
                }
            };

            // 1. Emit terminal_started event
            emitTerminal({
                type: 'terminal_started',
                command,
                cwd: cwd || wsId,
                executionId
            });

            const startTime = Date.now();

            if (isLocalPath(wsId)) {
                try {
                    const execCwd = cwd ? (path.isAbsolute(cwd) ? cwd : path.resolve(wsId!, cwd)) : wsId;
                    const res = await new Promise<{ stdout: string; stderr: string; exitCode: number; isAborted?: boolean; isTimeout?: boolean }>((resolve) => {
                        let stdout = '';
                        let stderr = '';
                        let resolved = false;

                        const child = spawn('bash', ['-c', command], {
                            cwd: execCwd,
                            detached: true
                        });

                        const procKey = executionId || `cmd_local_${Date.now()}`;
                        activeCommandRegistry.register({
                            sessionId: procKey,
                            executionId,
                            workspaceId: wsId,
                            child,
                            startedAt: Date.now(),
                            sendInput: (input: string) => {
                                if (child.stdin && child.stdin.writable) {
                                    child.stdin.write(input.endsWith('\n') ? input : `${input}\n`);
                                    return true;
                                }
                                return false;
                            },
                            abort: () => {
                                try {
                                    if (child.pid) process.kill(-child.pid, 'SIGINT');
                                    else child.kill('SIGINT');
                                    setTimeout(() => {
                                        try {
                                            if (child.pid && !child.killed) process.kill(-child.pid, 'SIGKILL');
                                        } catch {
                                            // ignore
                                        }
                                    }, 1000);
                                    return true;
                                } catch {
                                    return false;
                                }
                            }
                        });

                        let isTimedOut = false;
                        const finishProc = (code: number | null, sig: string | null): void => {
                            if (resolved) return;
                            resolved = true;
                            activeCommandRegistry.unregister(procKey);
                            let finalExitCode = code ?? 0;
                            let finalAborted = false;
                            let finalTimeout = false;
                            if (isTimedOut || code === 124) {
                                finalExitCode = 124;
                                finalTimeout = true;
                                if (!stderr.includes('timed out')) {
                                    stderr += (stderr ? '\n' : '') + 'Command timed out (exceeded time limit)';
                                }
                            } else if (sig === 'SIGINT' || sig === 'SIGTERM' || code === 130) {
                                finalExitCode = 130;
                                finalAborted = true;
                            }
                            resolve({
                                stdout,
                                stderr,
                                exitCode: finalExitCode,
                                isAborted: finalAborted,
                                isTimeout: finalTimeout
                            });
                        };

                        child.stdout?.on('data', (chunk) => {
                            const text = chunk.toString();
                            stdout += text;
                            emitTerminal({
                                type: 'terminal_output',
                                stream: 'stdout',
                                chunk: text,
                                line: text
                            });
                        });

                        child.stderr?.on('data', (chunk) => {
                            const text = chunk.toString();
                            stderr += text;
                            emitTerminal({
                                type: 'terminal_output',
                                stream: 'stderr',
                                chunk: text,
                                line: text
                            });
                        });

                        child.on('close', (code, sig) => finishProc(code, sig));
                        child.on('error', (err) => {
                            stderr += `\nError: ${err.message}\n`;
                            finishProc(1, null);
                        });

                        if (timeoutMs > 0) {
                            setTimeout(() => {
                                if (!resolved) {
                                    isTimedOut = true;
                                    try {
                                        if (child.pid) process.kill(-child.pid, 'SIGTERM');
                                    } catch {
                                        // ignore
                                    }
                                }
                            }, timeoutMs);
                        }
                    });

                    const durationMs = Date.now() - startTime;
                    const isSuccess = res.exitCode === 0;

                    emitTerminal({
                        type: isSuccess ? 'terminal_exit' : 'terminal_error',
                        exitCode: res.exitCode,
                        stdout: res.stdout,
                        stderr: res.stderr,
                        durationMs,
                        isAborted: res.exitCode === 130 || res.isAborted,
                        isTimeout: res.exitCode === 124 || res.isTimeout,
                        error: isSuccess ? undefined : (res.stderr || `Command exited with code ${res.exitCode}`)
                    });

                    return {
                        status: isSuccess ? "success" : "error",
                        exitCode: res.exitCode,
                        stdout: res.stdout,
                        stderr: res.stderr,
                        isAborted: res.exitCode === 130 || res.isAborted,
                        isTimeout: res.exitCode === 124 || res.isTimeout,
                        error: isSuccess ? undefined : (res.stderr || `Command exited with code ${res.exitCode}`)
                    };
                } catch (err: any) {
                    emitTerminal({
                        type: 'terminal_error',
                        exitCode: 1,
                        error: err.message,
                        stderr: err.message
                    });
                    return { status: "error", error: err.message, exitCode: 1, stdout: '', stderr: err.message };
                }
            }

            try {
                const res = await globalWorkspaceService.runCommand(userId, wsId, command, {
                    cwd,
                    timeoutMs,
                    sessionId: executionId || sessionId,
                    onStdout: (chunk: string) => {
                        emitTerminal({
                            type: 'terminal_output',
                            stream: 'stdout',
                            chunk,
                            line: chunk
                        });
                    },
                    onStderr: (chunk: string) => {
                        emitTerminal({
                            type: 'terminal_output',
                            stream: 'stderr',
                            chunk,
                            line: chunk
                        });
                    }
                });

                const durationMs = Date.now() - startTime;
                const isSuccess = res.exitCode === 0;
                const isAborted = res.exitCode === 130 || (res as any).isAborted;
                const isTimeout = res.exitCode === 124 || (res as any).isTimeout;

                emitTerminal({
                    type: isSuccess ? 'terminal_exit' : 'terminal_error',
                    exitCode: res.exitCode,
                    stdout: res.stdout,
                    stderr: res.stderr,
                    durationMs,
                    isAborted,
                    isTimeout,
                    error: isSuccess ? undefined : (res.stderr || `Command exited with code ${res.exitCode}`)
                });

                return {
                    status: isSuccess ? "success" : "error",
                    exitCode: res.exitCode,
                    stdout: res.stdout,
                    stderr: res.stderr,
                    isAborted,
                    isTimeout,
                    error: isSuccess ? undefined : (res.stderr || `Command exited with code ${res.exitCode}`)
                };
            } catch (err: any) {
                emitTerminal({
                    type: 'terminal_error',
                    exitCode: 1,
                    error: err.message,
                    stderr: err.message
                });
                return { status: "error", error: err.message, exitCode: 1, stdout: '', stderr: err.message };
            }
        });
    }

    public async executeTool(
        name: string,
        args: any,
        workspaceDirOrId?: string,
        context?: any
    ): Promise<{ success: boolean; output?: any; error?: string }> {
        const wsId = workspaceDirOrId || (typeof this.payload === 'string' ? this.payload : this.payload?.workspaceId);
        const dummyContext: ExecutionContext = context || {
            executionId: (this.payload as any)?.executionId || `exec_${Date.now()}`,
            sessionId: (this.payload as any)?.sessionId,
            taskId: `task_${Date.now()}`,
            workspaceId: wsId,
            scope: { permissions: [], allowedTools: ['*'] }
        };
        if (!dummyContext.workspaceId) {
            dummyContext.workspaceId = wsId;
        }
        if (!(dummyContext as any).sessionId && (this.payload as any)?.sessionId) {
            (dummyContext as any).sessionId = (this.payload as any).sessionId;
        }

        // Notify tool call phase
        this.sendEvent('tool_activity', {
            phase: 'call',
            tool: name,
            args
        });
        if (this.payload && typeof this.payload.emitSessionEvent === 'function') {
            this.payload.emitSessionEvent({
                type: 'tool_activity',
                sessionId: this.payload.sessionId || 'active_session',
                workspaceId: wsId,
                timestamp: Date.now(),
                data: {
                    phase: 'call',
                    tool: name,
                    args
                }
            });
        }

        let tool: Tool;
        switch (name) {
            case 'view_file':
            case 'read_file':
                tool = this.createViewFileTool(wsId);
                break;
            case 'create_file':
                tool = this.createCreateFileTool(wsId);
                break;
            case 'edit_file':
                tool = this.createEditFileTool(wsId);
                break;
            case 'delete_file':
                tool = this.createDeleteFileTool(wsId);
                break;
            case 'list_dir':
                tool = this.createListDirTool(wsId);
                break;
            case 'run_command':
                tool = this.createRunCommandTool(wsId);
                break;
            case 'execute_code':
                tool = this.createExecuteCodeTool();
                break;
            case 'proposeKnowledge':
                tool = this.createProposeKnowledgeTool();
                break;
            case 'read_github_repo':
                tool = this.createReadGithubRepoTool();
                break;
            default:
                throw new Error(`Unknown tool: ${name}`);
        }

        const rawResult: any = await tool.execute(dummyContext, args);
        const hasExitError = rawResult?.exitCode !== undefined && rawResult.exitCode !== 0;
        const isSuccess = rawResult?.status !== 'error' && !rawResult?.error && !hasExitError;
        let output: any = rawResult;
        if (name === 'view_file' || name === 'read_file') {
            output = rawResult?.content !== undefined ? rawResult.content : rawResult;
        } else if (name === 'list_dir') {
            output = rawResult?.entries !== undefined ? rawResult.entries : rawResult;
        } else if (name === 'run_command') {
            output = rawResult?.stdout || rawResult?.stderr || rawResult;
        }

        const failureError = isSuccess ? undefined : (rawResult?.error || rawResult?.stderr || (hasExitError ? `Command failed with exit code ${rawResult.exitCode}` : undefined));

        // Notify tool result phase
        this.sendEvent('tool_activity', {
            phase: 'result',
            tool: name,
            success: isSuccess,
            result: output,
            error: failureError
        });
        if (this.payload && typeof this.payload.emitSessionEvent === 'function') {
            this.payload.emitSessionEvent({
                type: 'tool_activity',
                sessionId: this.payload.sessionId || 'active_session',
                workspaceId: wsId,
                timestamp: Date.now(),
                data: {
                    phase: 'result',
                    tool: name,
                    success: isSuccess,
                    result: output,
                    error: failureError
                }
            });
        }

        return {
            success: isSuccess,
            output,
            error: failureError
        };
    }
}
