import { ProviderInterface, ModelInformation, ChatGenerateConfig } from "./ProviderInterface";

export class OllamaProvider implements ProviderInterface {
  name: string = "Ollama";

  async checkKey(key: string): Promise<{ valid: boolean; models?: ModelInformation[]; error?: string }> {
    let url = key.trim();
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }

    try {
      console.log(`Connecting to Ollama via api/tags on ${url}...`);
      const token = localStorage.getItem('session');
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url: `${url}/api/tags`, method: 'GET' })
      });
      if (!response.ok) {
        throw new Error(`Ollama returned status ${response.status}`);
      }
      const data = await response.json();
      const models = (data.models || []).map((m: any) => ({
        id: m.name,
        displayName: m.name,
        description: "Ollama Local Model",
        supportedGenerationMethods: ["generateContent"]
      }));
      return { valid: true, models: models.length > 0 ? models : [{ id: 'llama3', displayName: 'llama3', description: 'Ollama model placeholder' }] };
    } catch (err: any) {
      console.warn(`Ollama api/tags failed, attempting v1/models fallback on ${url}:`, err);
      const token = localStorage.getItem('session');
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url: `${url}/v1/models`, method: 'GET' })
      });
      if (!response.ok) {
        throw new Error(`Ollama fallback returned status ${response.status}`);
      }
      const data = await response.json();
      const models = (data.data || []).map((m: any) => ({
        id: m.id,
        displayName: m.id,
        description: "Ollama Local Model",
        supportedGenerationMethods: ["generateContent"]
      }));
      return { valid: true, models };
    }
  }

  async generateResponse(
    prompt: string,
    history: { role: 'user' | 'model', parts: any[] }[],
    systemPrompt: string,
    config: ChatGenerateConfig,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const apiKey = config.customKey;
    if (!apiKey) {
      throw new Error(`Ollama service URL is required (entered via API Key field)`);
    }

    let cleanUrl = apiKey.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    if (!cleanUrl.endsWith('/v1')) {
      cleanUrl = `${cleanUrl}/v1`;
    }
    const baseUrl = cleanUrl;

    const messages = history.map(h => {
      const content = h.parts.map(p => {
        if (p.text) return p.text;
        if (p.inlineData) return `[Binary Attachment: ${p.inlineData.mimeType}]`;
        return "";
      }).join('\n');
      
      return {
        role: h.role === 'model' ? 'assistant' : 'user',
        content: content
      };
    });

    messages.unshift({ role: 'system', content: systemPrompt });

    const token = localStorage.getItem('session');
    const response = await fetch(`/api/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        url: `${baseUrl}/chat/completions`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        stream: true,
        body: {
          model: config.model,
          messages,
          stream: true
        }
      }),
      signal: config.signal
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "N/A");
      throw new Error(`Ollama HTTP error ${response.status}: ${errText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = "";
    let buffer = "";

    if (!reader) throw new Error("Response body is not readable");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === 'data: [DONE]') break;
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const content = data.choices?.[0]?.delta?.content || "";
            accumulatedText += content;
            onChunk?.(accumulatedText);
          } catch (e) {}
        }
      }
    }
    return accumulatedText;
  }
}
