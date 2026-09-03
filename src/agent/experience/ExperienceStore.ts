export interface ExperienceEvent {
  id: string;
  sessionId: string;
  taskId?: string;
  timestamp: number;
  type: 'TOOL_EXECUTION' | 'REFLECTION' | 'LEARNING' | 'PLAN_STEP';
  payload: Record<string, unknown>;
  metadata: {
    durationMs?: number;
    success: boolean;
    errorType?: string;
  };
}

export interface ExperienceQuery {
  sessionId?: string;
  taskId?: string;
  type?: string;
  successOnly?: boolean;
  limit?: number;
  since?: number;
}

export interface ExperienceStore {
  append(event: Omit<ExperienceEvent, 'id' | 'timestamp'>): Promise<ExperienceEvent>;
  query(filter: ExperienceQuery): Promise<ExperienceEvent[]>;
  getSessionEvents(sessionId: string): Promise<ExperienceEvent[]>;
  prune(olderThanMs: number): Promise<number>;
}
