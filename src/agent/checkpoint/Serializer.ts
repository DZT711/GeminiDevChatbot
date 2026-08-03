import { ExecutionSnapshot } from '../runtime/ExecutionSnapshot';

export interface CheckpointSerializer {
  serialize(snapshot: ExecutionSnapshot): string;
  deserialize(data: string): ExecutionSnapshot;
}

export class JSONCheckpointSerializer implements CheckpointSerializer {
  public serialize(snapshot: ExecutionSnapshot): string {
    return JSON.stringify(snapshot);
  }

  public deserialize(data: string): ExecutionSnapshot {
    return JSON.parse(data) as ExecutionSnapshot;
  }
}
