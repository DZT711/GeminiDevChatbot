/**
 * Purpose: In-memory reference implementation of Workspace for unit tests,
 * mock execution, and isolated Planning Lab simulations.
 * STRICT ARCHITECTURAL RULE: Zero external sandbox dependencies.
 */
import { Workspace } from './Workspace';
import { WorkspaceState } from './WorkspaceState';
import {
  WorkspaceRef,
  WorkspaceFile,
  WorkspaceDirectoryListing,
  WorkspaceDirectoryEntry,
  WorkspaceEdit,
  RunCommandOptions,
  CommandResult,
  WorkspacePathError
} from './WorkspaceTypes';

export class InMemoryWorkspace implements Workspace {
  public readonly id: string;
  public state: WorkspaceState;
  private files: Map<string, WorkspaceFile> = new Map();
  private directories: Set<string> = new Set();
  private workingDirectory: string;
  private isDestroyed = false;

  constructor(id: string, workingDirectory = '/workspace', initialFiles: WorkspaceFile[] = []) {
    this.id = id;
    this.workingDirectory = this.normalizePath(workingDirectory);
    this.state = {
      currentDirectory: this.workingDirectory
    };

    for (const file of initialFiles) {
      const normalizedPath = this.normalizePath(file.path);
      this.files.set(normalizedPath, {
        path: normalizedPath,
        content: file.content,
        size: file.content.length,
        modifiedAt: file.modifiedAt || Date.now()
      });
    }
  }

  public getId(): string {
    return this.id;
  }

  public getRef(): WorkspaceRef {
    return {
      id: this.id,
      name: `InMemoryWorkspace-${this.id}`,
      workingDirectory: this.workingDirectory,
      createdAt: Date.now(),
      metadata: {
        provider: 'in-memory',
        fileCount: this.files.size
      }
    };
  }

  public getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  private normalizePath(inputPath: string): string {
    if (!inputPath || inputPath.trim() === '') {
      return this.workingDirectory;
    }

    // Check for suspicious directory traversal attempts
    const raw = inputPath.replace(/\\/g, '/');
    if (raw.includes('../') || raw.includes('/..') || raw === '..') {
      const parts = raw.split('/');
      let depth = 0;
      for (const p of parts) {
        if (p === '..') {
          depth--;
          if (depth < 0) {
            throw new WorkspacePathError(
              `Path traversal outside workspace root is blocked: ${inputPath}`,
              inputPath
            );
          }
        } else if (p && p !== '.') {
          depth++;
        }
      }
    }

    // Absolute vs relative to workingDirectory
    let normalized = raw;
    if (!normalized.startsWith('/')) {
      normalized = `${this.workingDirectory}/${normalized}`.replace(/\/+/g, '/');
    } else {
      normalized = `/${normalized.split('/').filter(Boolean).join('/')}`;
    }

    return normalized;
  }


  private toRelativePath(absolutePath: string): string {
    const wd = this.workingDirectory.endsWith('/') ? this.workingDirectory : `${this.workingDirectory}/`;
    if (absolutePath.startsWith(wd)) {
      return absolutePath.substring(wd.length).replace(/^\//, '');
    }
    if (absolutePath === this.workingDirectory) return '';
    return absolutePath.replace(/^\//, '');
  }

  public async listDir(dirPath?: string): Promise<WorkspaceDirectoryListing> {
    this.ensureActive();
    const targetDir = this.normalizePath(dirPath || this.workingDirectory);
    const normalizedTarget = targetDir.endsWith('/') ? targetDir : `${targetDir}/`;
    const entries: WorkspaceDirectoryEntry[] = [];
    const seenNames = new Set<string>();

    // 1. Scan explicit directories
    for (const d of this.directories) {
      if (d.startsWith(normalizedTarget) && d !== targetDir) {
        const relative = d.substring(normalizedTarget.length);
        const name = relative.split('/').filter(Boolean)[0];
        if (name && !seenNames.has(name)) {
          seenNames.add(name);
          entries.push({
            name,
            path: this.toRelativePath(`${targetDir}/${name}`.replace(/\/+/g, '/')),
            isDirectory: true
          });
        }
      }
    }

    // 2. Scan file paths
    for (const [filePath, file] of this.files.entries()) {
      if (filePath.startsWith(normalizedTarget) && filePath !== targetDir) {
        const relative = filePath.substring(normalizedTarget.length);
        const parts = relative.split('/').filter(Boolean);
        const name = parts[0];

        if (name && !seenNames.has(name)) {
          seenNames.add(name);
          const isDirectory = parts.length > 1;
          entries.push({
            name,
            path: this.toRelativePath(isDirectory ? `${targetDir}/${name}`.replace(/\/+/g, '/') : filePath),
            isDirectory,
            size: isDirectory ? undefined : file.size,
            modifiedAt: file.modifiedAt
          });
        }
      }
    }

    return {
          path: this.toRelativePath(targetDir),
          entries,
          total: entries.length
        };
  }

  public async makeDir(dirPath: string): Promise<void> {
    this.ensureActive();
    const normalized = this.normalizePath(dirPath);
    this.directories.add(normalized);
  }

  public async deleteDir(dirPath: string, _recursive = true): Promise<void> {
    this.ensureActive();
    const normalized = this.normalizePath(dirPath);
    const prefix = normalized.endsWith('/') ? normalized : `${normalized}/`;
    this.directories.delete(normalized);
    for (const d of Array.from(this.directories)) {
      if (d.startsWith(prefix) || d === normalized) {
        this.directories.delete(d);
      }
    }
    for (const [filePath] of this.files.entries()) {
      if (filePath === normalized || filePath.startsWith(prefix)) {
        this.files.delete(filePath);
      }
    }
  }

  public async readFile(filePath: string): Promise<WorkspaceFile> {
    this.ensureActive();
    const normalized = this.normalizePath(filePath);
    const file = this.files.get(normalized);
    if (!file) {
      throw new Error(`File not found in workspace: ${filePath} (resolved: ${normalized})`);
    }
    return { ...file };
  }

  public async writeFile(filePath: string, content: string): Promise<void> {
    this.ensureActive();
    const normalized = this.normalizePath(filePath);
    this.files.set(normalized, {
      path: normalized,
      content,
      size: content.length,
      modifiedAt: Date.now()
    });
  }

  public async editFile(filePath: string, edit: WorkspaceEdit): Promise<void> {
    this.ensureActive();
    const normalized = this.normalizePath(filePath);
    const existing = this.files.get(normalized);
    let existingContent = existing ? existing.content : '';
    let newContent = existingContent;

    if (edit.targetContent !== undefined && edit.replacementContent !== undefined) {
      if (!newContent.includes(edit.targetContent)) {
        if (!existingContent) {
          newContent = edit.replacementContent;
        } else {
          throw new Error(`Target content not found in file ${filePath} for replacement.`);
        }
      } else {
        newContent = newContent.replace(edit.targetContent, edit.replacementContent);
      }
    } else if (edit.range && edit.replacementContent !== undefined) {
      const lines = newContent.split('\n');
      const start = Math.max(0, edit.range.startLine - 1);
      const end = Math.min(lines.length, edit.range.endLine);
      lines.splice(start, end - start, edit.replacementContent);
      newContent = lines.join('\n');
    } else if (edit.replacementContent !== undefined) {
      newContent = edit.replacementContent;
    }

    this.files.set(normalized, {
      path: normalized,
      content: newContent,
      size: newContent.length,
      modifiedAt: Date.now()
    });
  }

  public async deleteFile(filePath: string): Promise<void> {
    this.ensureActive();
    const normalized = this.normalizePath(filePath);
    if (!this.files.has(normalized)) {
      throw new Error(`Cannot delete non-existent file: ${filePath}`);
    }
    this.files.delete(normalized);
  }

  public async runCommand(command: string, options?: RunCommandOptions): Promise<CommandResult> {
    this.ensureActive();
    const startTime = Date.now();

    // Safe simulated shell evaluation for in-memory environments
    if (command.startsWith('echo ')) {
      const text = command.substring(5).replace(/^['"]|['"]$/g, '');
      return {
        exitCode: 0,
        stdout: `${text}\n`,
        stderr: '',
        durationMs: Date.now() - startTime
      };
    }

    // Check if any file in memory is being printed or read
    for (const [filePath, file] of this.files.entries()) {
      const baseName = filePath.split('/').pop() || filePath;
      if (command.includes(baseName) || command.includes(filePath)) {
        if (command.startsWith('cat ') || command.includes('cat ') || command.includes('type ')) {
          return {
            exitCode: 0,
            stdout: `${file.content}\n`,
            stderr: '',
            durationMs: Date.now() - startTime
          };
        }
      }
    }

    if (command.startsWith('node -e ') || command.startsWith('node -p ')) {
      const jsCode = command.replace(/^node -[ep] /, '').replace(/^['"]|['"]$/g, '');
      try {
        // Safe evaluation
        if (jsCode.includes("console.log('workspace-ok')") || jsCode.includes('workspace-ok')) {
          return {
            exitCode: 0,
            stdout: 'workspace-ok\n',
            stderr: '',
            durationMs: Date.now() - startTime
          };
        }
      } catch (err: unknown) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: String(err),
          durationMs: Date.now() - startTime
        };
      }
    }

    return {
      exitCode: 0,
      stdout: `[InMemoryWorkspace] Executed: ${command}\n`,
      stderr: '',
      durationMs: Date.now() - startTime
    };
  }

  public async executeCode(code: string, language: string): Promise<CommandResult> {
    this.ensureActive();
    return {
      exitCode: 0,
      stdout: `[InMemoryWorkspace] Executed ${language} code (${code.length} chars)\n`,
      stderr: '',
      durationMs: 5
    };
  }

  public async listFiles(): Promise<WorkspaceFile[]> {
    this.ensureActive();
    return Array.from(this.files.values());
  }

  public async cleanup(): Promise<void> {
    this.files.clear();
    this.isDestroyed = true;
  }

  private ensureActive(): void {
    if (this.isDestroyed) {
      throw new Error(`Workspace ${this.id} has been destroyed and is no longer accessible.`);
    }
  }
}
