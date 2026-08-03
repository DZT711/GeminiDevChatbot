/**
 * Purpose: Represents a generated asset (e.g., file, image, code block).
 */
import { ArtifactMetadata } from './ArtifactMetadata';

export interface Artifact {
  id: string;
  metadata: ArtifactMetadata;
  content: any; // URL, text, or binary data
}
