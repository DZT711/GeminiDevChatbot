import { useEffect, useState } from 'react';

export type ActionCategory = 'Research/Retrieval' | 'Learning' | 'Analysis' | 'Task Execution';

export interface ModelAction {
  id: string;
  timestamp: number;
  category: ActionCategory;
  description: string;
  metadata?: Record<string, any>;
  status?: 'pending' | 'active' | 'completed' | 'failed';
  outputPayload?: any;
  durationMs?: number;
}

type Listener = (actions: ModelAction[]) => void;

class TransparencyLogger {
  private actions: ModelAction[] = [];
  private listeners: Set<Listener> = new Set();

  public readonly authorizedDomains = [
    { domain: '*.google.com', purpose: 'Search Grounding & Indexing' },
    { domain: 'api.github.com', purpose: 'Repository Analysis' },
    { domain: 'cdnjs.com', purpose: 'Library Retrieval' }
  ];

  public log(category: ActionCategory, description: string, metadata?: Record<string, any>, status: ModelAction['status'] = 'completed'): string {
    const action: ModelAction = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: Date.now(),
      category,
      description,
      metadata,
      status
    };

    this.actions = [action, ...this.actions].slice(0, 150); // retain last 150
    this.listeners.forEach(l => l(this.actions));
    return action.id;
  }

  public updateAction(id: string, updates: Partial<Pick<ModelAction, 'status' | 'outputPayload' | 'durationMs' | 'metadata' | 'description'>>) {
    const index = this.actions.findIndex(a => a.id === id);
    if (index !== -1) {
      if (updates.status === 'completed' || updates.status === 'failed') {
         updates.durationMs = updates.durationMs || (Date.now() - this.actions[index].timestamp);
      }
      this.actions[index] = { ...this.actions[index], ...updates };
      // create a new array ref to trigger react renders
      this.actions = [...this.actions];
      this.listeners.forEach(l => l(this.actions));
    }
  }

  public getActions() {
    return this.actions;
  }

  public subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.actions);
    return () => { this.listeners.delete(listener); };
  }

  public clear() {
    this.actions = [];
    this.listeners.forEach(l => l(this.actions));
  }
}

export const transparencyLogger = new TransparencyLogger();

export const useTransparencyLog = () => {
  const [actions, setActions] = useState<ModelAction[]>(transparencyLogger.getActions());

  useEffect(() => {
    return transparencyLogger.subscribe(setActions);
  }, []);

  return actions;
};
