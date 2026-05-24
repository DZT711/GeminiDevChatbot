import { ProviderInterface, ModelInformation, ChatGenerateConfig } from "./ProviderInterface";

export class OpenAICompatibleProvider implements ProviderInterface {
  name: string;
  baseUrl: string;

  constructor(name: string, baseUrl: string) {
    this.name = name;
    this.baseUrl = baseUrl;
  }

  async checkKey(key: string): Promise<{ valid: boolean; models?: ModelInformation[]; error?: string }> {
    try {
      const token = localStorage.getItem('session');
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          url: `${this.baseUrl}/models`,
          method: 'GET',
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "DevGenie AI"
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "N/A");
        console.error(`[checkKey] HTTP ${response.status} from proxy for ${this.name} models`, {
          status: response.status,
          statusText: response.statusText,
          url: `${this.baseUrl}/models`,
          body: errText
        });
        let errData;
        try { errData = JSON.parse(errText); } catch(e) {}
        throw new Error(errData?.error?.message || errData?.message || "Invalid API Key");
      }

      const data = await response.json();
      const models = (data.data || []).map((m: any) => ({
        id: m.id,
        displayName: m.id,
        description: `Node from ${this.name}`,
        supportedGenerationMethods: ["generateContent"]
      }));

      return { valid: true, models };
    } catch (error: any) {
      console.error(`${this.name} Key Validation Error:`, error);
      return {
        valid: false,
        error: error.message || "Authentication Failed"
      };
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
      throw new Error(`API Key required for ${this.name}`);
    }

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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'DevGenie AI'
    };

    const token = localStorage.getItem('session');
    const response = await fetch(`/api/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        url: `${this.baseUrl}/chat/completions`,
        method: 'POST',
        headers,
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
      console.error(`[generateResponse] HTTP ${response.status} from proxy for ${this.baseUrl}/chat/completions`, {
        status: response.status,
        statusText: response.statusText,
        body: errText,
        baseUrl: this.baseUrl,
        model: config.model
      });
      let errData;
      try { errData = JSON.parse(errText); } catch(e) {}
      throw new Error(errData?.error?.message || errData?.message || `HTTP error ${response.status}`);
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
          } catch (e) {
            console.warn("Error parsing chunk", trimmed, e);
          }
        }
      }
    }
    return accumulatedText;
  }
}
