import type { ChildProcess } from 'child_process';

export interface ActiveTerminalProcess {
  sessionId: string;
  executionId?: string;
  workspaceId?: string;
  child: ChildProcess;
  startedAt: number;
  sendInput: (input: string) => boolean;
  abort: () => boolean;
}

class ActiveCommandRegistry {
  private sessions = new Map<string, ActiveTerminalProcess>();

  public register(session: ActiveTerminalProcess): void {
    this.sessions.set(session.sessionId, session);
    if (session.executionId) {
      this.sessions.set(session.executionId, session);
    }
  }

  public unregister(sessionIdOrExecutionId: string): void {
    const session = this.sessions.get(sessionIdOrExecutionId);
    if (session) {
      this.sessions.delete(session.sessionId);
      if (session.executionId) {
        this.sessions.delete(session.executionId);
      }
    } else {
      this.sessions.delete(sessionIdOrExecutionId);
    }
  }

  public get(sessionIdOrExecutionId: string): ActiveTerminalProcess | undefined {
    return this.sessions.get(sessionIdOrExecutionId);
  }

  public getByExecution(executionId: string): ActiveTerminalProcess | undefined {
    for (const proc of this.sessions.values()) {
      if (proc.executionId === executionId) {
        return proc;
      }
    }
    return undefined;
  }

  public sendInput(sessionIdOrExecutionId: string, input: string): boolean {
    const session = this.sessions.get(sessionIdOrExecutionId);
    if (!session) return false;
    return session.sendInput(input);
  }

  public abort(sessionIdOrExecutionId: string): boolean {
    const session = this.sessions.get(sessionIdOrExecutionId);
    if (session) {
      return session.abort();
    }
    for (const proc of this.sessions.values()) {
      if (proc.sessionId === sessionIdOrExecutionId || proc.executionId === sessionIdOrExecutionId) {
        return proc.abort();
      }
    }
    return false;
  }

  public abortByExecution(executionId: string): boolean {
    return this.abort(executionId);
  }

  public getAll(): ActiveTerminalProcess[] {
    return Array.from(new Set(this.sessions.values()));
  }
}

export const activeCommandRegistry = new ActiveCommandRegistry();
