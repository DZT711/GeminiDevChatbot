import { Checkpoint } from './Checkpoint';

export interface CheckpointStore {
  save(checkpoint: Checkpoint): Promise<void>;
  load(checkpointId: string): Promise<Checkpoint | null>;
  list(executionId: string): Promise<Checkpoint[]>;
  delete(checkpointId: string): Promise<void>;
}

export class InMemoryCheckpointStore implements CheckpointStore {
  private checkpoints: Map<string, Checkpoint> = new Map();

  public async save(checkpoint: Checkpoint): Promise<void> {
    this.checkpoints.set(checkpoint.id, checkpoint);
  }

  public async load(checkpointId: string): Promise<Checkpoint | null> {
    return this.checkpoints.get(checkpointId) || null;
  }

  public async list(executionId: string): Promise<Checkpoint[]> {
    return Array.from(this.checkpoints.values()).filter(c => c.executionId === executionId);
  }

  public async delete(checkpointId: string): Promise<void> {
    this.checkpoints.delete(checkpointId);
  }
}
