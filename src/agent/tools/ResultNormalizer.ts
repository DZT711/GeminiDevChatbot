import { ToolResult } from './ToolResult';

export class ResultNormalizer {
  public normalize(rawResult: unknown): ToolResult {
    if (rawResult && typeof rawResult === 'object' && 'success' in rawResult && 'timestamp' in rawResult) {
      return rawResult as ToolResult;
    }
    
    return {
      success: true,
      data: rawResult,
      timestamp: Date.now()
    };
  }

  public normalizeError(error: unknown): ToolResult {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      timestamp: Date.now()
    };
  }
}
