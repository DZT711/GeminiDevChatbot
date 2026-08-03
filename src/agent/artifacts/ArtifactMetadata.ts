/**
 * Purpose: Metadata for an artifact.
 */
export interface ArtifactMetadata {
  type: string;
  createdAt: number;
  sourceTaskId?: string;
}
