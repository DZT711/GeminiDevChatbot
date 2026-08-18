import { PromptContext, ContextSectionType } from '../../../../agent/context/ContextTypes.js';

export class PromptContextMapper {
    /**
     * Maps the M03 PromptContext into the legacy `finalSystemPrompt` format
     * to preserve existing LLM interaction behavior.
     */
    static toLegacySystemPrompt(context: PromptContext): string {
        let systemPrompt = '';
        let knowledge = '';
        let workspace = '';
        
        // ContextBuilder sorts by priority descending. 
        for (const section of context.sections) {
            if (section.type === ContextSectionType.SYSTEM) {
                systemPrompt = section.content;
            } else if (section.type === ContextSectionType.KNOWLEDGE) {
                knowledge += (knowledge ? '\n\n---\n\n' : '') + section.content;
            } else if (section.type === ContextSectionType.WORKSPACE) {
                workspace += (workspace ? '\n' : '') + section.content;
            } else if (section.type === ContextSectionType.MEMORY) {
                // If memory is introduced in the future
                knowledge += (knowledge ? '\n\n---\n\n' : '') + section.content;
            }
        }

        let finalPrompt = systemPrompt;
        
        if (workspace) {
            finalPrompt += `\n\n### WORKSPACE CONTEXT\n${workspace}`;
        }
        
        if (knowledge) {
            finalPrompt += `\n\n### RETRIEVED REPOSITORY CONTEXT\nUse the following active codebase memory contexts to formulate your answer:\n\n${knowledge}`;
        }
        
        return finalPrompt;
    }
}
