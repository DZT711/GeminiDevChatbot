import { ContextBuilderRequest, PromptContext } from './ContextTypes';

export interface ContextBuilder {
  /**
   * Assembles the prompt context based on the provided request.
   */
  build(request: ContextBuilderRequest): Promise<PromptContext>;
}
