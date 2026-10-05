import { GoogleGenAI } from '@google/genai';

let isPatched = false;

/**
 * Patches @google/genai's ApiClient.prototype.processStreamResponse to make SSE streaming
 * immune to trailing delimiter artifacts, premature stream closure without double newline,
 * and proxy 'data: [DONE]' completion markers.
 */
export function ensureGenAiStreamPatched(): void {
  if (isPatched) return;
  try {
    const dummy = new GoogleGenAI({ apiKey: 'patch_init_key' });
    const proto = Object.getPrototypeOf((dummy as unknown as Record<string, unknown>).apiClient);
    if (!proto || typeof proto.processStreamResponse !== 'function') {
      return;
    }

    const originalProcessStreamResponse = proto.processStreamResponse;

    proto.processStreamResponse = async function* (response: Response) {
      if (!response || !response.body) {
        return;
      }

      const originalReader = response.body.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder('utf-8');
      let trailingBuffer = '';

      const sanitizedStream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const { done, value } = await originalReader.read();
            if (done) {
              const trimmed = trailingBuffer.trim();
              // If there's an unflushed SSE line (e.g., data: {...}\n), appending double newlines
              // allows @google/genai to parse the final chunk instead of throwing 'Incomplete JSON segment at the end'
              if (trimmed.length > 0 && (trimmed.endsWith('}') || trimmed.endsWith('}\n') || !trimmed.endsWith('\n\n'))) {
                controller.enqueue(encoder.encode('\n\n\n\n'));
              }
              controller.close();
              return;
            }

            let text = decoder.decode(value, { stream: true });
            trailingBuffer += text;

            // Normalize proxy '[DONE]' markers into an SSE comment (: done) so @google/genai does not attempt JSON parse on '[DONE]'
            if (text.includes('[DONE]')) {
              text = text.replace(/data:\s*\[DONE\]/g, ': done');
            }

            controller.enqueue(encoder.encode(text));
          } catch (readErr) {
            controller.error(readErr);
          }
        },
        cancel(reason) {
          return originalReader.cancel(reason);
        }
      });

      const sanitizedResponse = new Response(sanitizedStream, {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText
      });

      try {
        for await (const chunk of originalProcessStreamResponse.call(this, sanitizedResponse)) {
          yield chunk;
        }
      } catch (streamErr: unknown) {
        const errMsg = streamErr instanceof Error ? streamErr.message : String(streamErr);
        if (errMsg.includes('Incomplete JSON segment at the end')) {
          console.warn('[GenAI Stream Patch] Handled and gracefully completed trailing Incomplete JSON segment in SSE stream.');
          return;
        }
        throw streamErr;
      }
    };

    isPatched = true;
  } catch (patchErr) {
    console.warn('[GenAI Stream Patch] Could not apply stream patch:', patchErr);
  }
}
