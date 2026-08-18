import { ContextBuilderRequest } from '../../../../agent/context/ContextTypes.js';

export class ContextBuilderAdapter {
    static toContextBuilderRequest(
        userPrompt: string,
        systemPrompt: string,
        history: { role: string; content: string }[],
        knowledge: { id: string; content: string }[] | undefined,
        customInstructions?: string,
        sandboxInstructions?: string
    ): ContextBuilderRequest {
        let finalSystemPrompt = systemPrompt;
        if (sandboxInstructions) {
            finalSystemPrompt += `\n\n${sandboxInstructions}`;
        }
        if (customInstructions) {
            finalSystemPrompt += `\n\nUser Custom Personalization:\n${customInstructions}`;
        }

        return {
            systemPrompt: finalSystemPrompt,
            userPrompt,
            conversationHistory: history.length > 0 ? history : undefined,
            knowledge: knowledge && knowledge.length > 0 ? knowledge : undefined,
            tokenBudget: {
                maxTokens: 1048576, // Gemini 1.5 Pro max context
                reservedCompletionTokens: 8192,
            }
        };
    }
}
