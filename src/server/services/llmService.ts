import { GoogleGenAI, Type } from '@google/genai';
import OpenAI from 'openai';

export class LLMService {
  public getTypeEnum() {
    return Type;
  }

  public getClient(apiKey: string, baseUrl?: string, provider?: string): any {
    if (provider === 'openrouter' || provider === 'openai' || (baseUrl && baseUrl.includes('openrouter'))) {
      const openai = new OpenAI({
        apiKey,
        baseURL: baseUrl || (provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : undefined),
        defaultHeaders: provider === 'openrouter' || (baseUrl && baseUrl.includes('openrouter')) ? {
          'HTTP-Referer': 'https://aistudio.google.com',
          'X-Title': 'DevGenie',
        } : undefined
      });
      return {
        models: {
          generateContentStream: async function* (params: any) {
            let messages = [];
            if (params.config?.systemInstruction) {
               messages.push({ role: 'system', content: params.config.systemInstruction });
            }
            if (params.contents) {
               for (const part of params.contents) {
                  const role = part.role === 'model' ? 'assistant' : 'user';
                  let content = '';
                  if (part.parts && Array.isArray(part.parts)) {
                     content = part.parts.map((p: any) => p.text || '').join('');
                  } else {
                     content = part.text || '';
                  }
                  messages.push({ role, content });
               }
            }
            
            const stream = await openai.chat.completions.create({
               model: params.model,
               messages,
               stream: true,
            });
            
            for await (const chunk of stream) {
               const text = chunk.choices[0]?.delta?.content || '';
               if (text) {
                  yield {
                     text,
                     candidates: [{ content: { parts: [{ text }] } }]
                  };
               }
            }
          }
        }
      };
    }
    
    const httpOptions: any = { apiVersion: 'v1beta' };
    if (baseUrl) {
      httpOptions.baseUrl = baseUrl;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions
    });
  }
}
