export enum ArtifactType {
  GENERATED_FILE = 'GENERATED_FILE',
  PLAN = 'PLAN',
  DIFF = 'DIFF',
  PATCH = 'PATCH',
  MARKDOWN = 'MARKDOWN',
  IMAGE_REFERENCE = 'IMAGE_REFERENCE',
  LOG = 'LOG',
  REPORT = 'REPORT',
  OTHER = 'OTHER'
}

export interface ExecutionArtifactMetadata {
  createdAt: number;
  author?: string;
  size?: number;
  contentType?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface ExecutionArtifact {
  id: string;
  type: ArtifactType;
  name: string;
  contentReference: string;
  metadata: ExecutionArtifactMetadata;
}
