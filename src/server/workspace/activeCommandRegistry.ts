import type { ChildProcess } from 'child_process';

export interface ActiveTerminalProcess {
  sessionId: string;
  child: ChildProcess;
  startedAt: number;
  sendInput: (input: string) => boolean;
  abort: () => boolean;
}

class ActiveCommandRegistry {
  private sessions = new Map<string, ActiveTerminalProcess>();

  public register(session: ActiveTerminalProcess): void {
    this.sessions.set(session.sessionId, session);
  }

  public unregister(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  public get(sessionId: string): ActiveTerminalProcess | undefined {
    return this.sessions.get(sessionId);
  }

  public sendInput(sessionId: string, input: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    return session.sendInput(input);
  }

  public abort(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    return session.abort();
  }
}

export const activeCommandRegistry = new ActiveCommandRegistry();
