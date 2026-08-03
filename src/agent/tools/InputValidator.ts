import { ToolSchema } from './ToolSchema';
import { ValidationError } from './ExecutionError';

export class InputValidator {
  public validate(input: unknown, schema: ToolSchema): void {
    if (input === undefined && schema.inputSchema && Object.keys(schema.inputSchema).length > 0) {
        throw new ValidationError('Input is required but was not provided.');
    }
    
    if (typeof input !== 'object' || input === null) {
        throw new ValidationError('Input must be a valid JSON object.', { input });
    }

    const inputRecord = input as Record<string, unknown>;
    const inputSchema = schema.inputSchema;

    if (inputSchema && inputSchema.required && Array.isArray(inputSchema.required)) {
      for (const req of inputSchema.required) {
        if (!(req in inputRecord)) {
          throw new ValidationError(`Missing required input field: ${req}`, { input });
        }
      }
    }
  }
}
