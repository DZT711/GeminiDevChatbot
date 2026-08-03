/**
 * Purpose: Manages a collection of artifacts generated during an execution.
 */
import { Artifact } from './Artifact';

export interface ArtifactCollection {
  add(artifact: Artifact): void;
  getAll(): Artifact[];
}
