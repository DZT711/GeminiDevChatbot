import { ExperienceEvent, ExperienceQuery, ExperienceStore } from './ExperienceStore.js';

export class InMemoryExperienceStore implements ExperienceStore {
  private events: ExperienceEvent[] = [];

  public async append(event: Omit<ExperienceEvent, 'id' | 'timestamp'>): Promise<ExperienceEvent> {
    const newEvent: ExperienceEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    this.events.push(newEvent);
    return newEvent;
  }

  public async query(filter: ExperienceQuery): Promise<ExperienceEvent[]> {
    let result = [...this.events];

    if (filter.sessionId) {
      result = result.filter(e => e.sessionId === filter.sessionId);
    }
    if (filter.taskId) {
      result = result.filter(e => e.taskId === filter.taskId);
    }
    if (filter.type) {
      result = result.filter(e => e.type === filter.type);
    }
    if (filter.successOnly !== undefined) {
      result = result.filter(e => e.metadata.success === filter.successOnly);
    }
    if (filter.since !== undefined) {
      result = result.filter(e => e.timestamp >= filter.since!);
    }

    // sort by timestamp descending (newest first) usually expected for queries, 
    // but the spec might imply keeping them in order. Let's return chronologically.
    result.sort((a, b) => a.timestamp - b.timestamp);

    if (filter.limit && result.length > filter.limit) {
      // If we want newest first, we'd take the end. If oldest, the start.
      // Usually limit implies the most recent ones if we don't specify.
      // Let's take the most recent ones.
      result = result.slice(-filter.limit);
    }

    return result;
  }

  public async getSessionEvents(sessionId: string): Promise<ExperienceEvent[]> {
    return this.query({ sessionId });
  }

  public async prune(olderThanMs: number): Promise<number> {
    const threshold = Date.now() - olderThanMs;
    const initialLength = this.events.length;
    this.events = this.events.filter(e => e.timestamp >= threshold);
    return initialLength - this.events.length;
  }

  // Helper for testing
  public async _clear(): Promise<void> {
    this.events = [];
  }
}
