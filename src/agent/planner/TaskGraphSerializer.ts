import { DirectedTaskGraph } from './TaskGraph.js';
import { TaskGraph, TaskGraphJSON } from './TaskGraphTypes.js';
import { InvalidTaskGraphError } from './TaskGraphErrors.js';

export class TaskGraphSerializer {
  public static serialize(graph: TaskGraph, pretty = false): string {
    if (!graph) {
      throw new InvalidTaskGraphError('Cannot serialize null or undefined TaskGraph');
    }
    const jsonObj = graph.toJSON();
    return pretty ? JSON.stringify(jsonObj, null, 2) : JSON.stringify(jsonObj);
  }

  public static deserialize(serialized: string): DirectedTaskGraph {
    if (!serialized || typeof serialized !== 'string' || serialized.trim() === '') {
      throw new InvalidTaskGraphError('Cannot deserialize empty string to TaskGraph');
    }

    try {
      const parsed = JSON.parse(serialized) as TaskGraphJSON;
      return DirectedTaskGraph.fromJSON(parsed);
    } catch (err: unknown) {
      if (err instanceof InvalidTaskGraphError) {
        throw err;
      }
      throw new InvalidTaskGraphError(
        `Failed to deserialize TaskGraph JSON: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
