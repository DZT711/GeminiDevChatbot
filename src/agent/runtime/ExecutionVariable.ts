export enum VariableType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  OBJECT = 'OBJECT',
  ARRAY = 'ARRAY',
  BINARY_REFERENCE = 'BINARY_REFERENCE',
  UNKNOWN = 'UNKNOWN'
}

export interface ExecutionVariable<T = unknown> {
  name: string;
  type: VariableType;
  value: T;
  description?: string;
  createdAt: number;
  updatedTime: number;
}
