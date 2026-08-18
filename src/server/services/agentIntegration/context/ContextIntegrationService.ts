import { SimpleContextBuilder } from '../../../../agent/context/SimpleContextBuilder.js';
import { ContextBuilderRequest, PromptContext } from '../../../../agent/context/ContextTypes.js';

export class ContextIntegrationService {
    private builder: SimpleContextBuilder;

    constructor() {
        this.builder = new SimpleContextBuilder();
    }

    async buildContext(request: ContextBuilderRequest): Promise<PromptContext> {
        return await this.builder.build(request);
    }
}
