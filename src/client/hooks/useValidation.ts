import { useState, useEffect } from "react";
import { geminiService } from "@/services/geminiService";
import { Provider } from "@/services/types";

export const validateKeyPrefix = (provider: Provider, key: string, expectedPrefix?: string): { valid: boolean; message?: string } => {
  const strictPrefixes: Partial<Record<Provider, string[]>> = {
    [Provider.GOOGLE]: ["AIza", "AQ."],
    [Provider.ANTHROPIC]: ["sk-ant-"],
    [Provider.OPENAI]: ["sk-"],
    [Provider.XAI]: ["xai-"],
  };

  let allowed = strictPrefixes[provider] || [];
  
  if (expectedPrefix) {
    allowed = [...allowed, expectedPrefix];
  }

  if (provider === Provider.CUSTOM) {
    if (expectedPrefix && !key.startsWith(expectedPrefix)) {
      return { valid: false, message: `Custom provider key must start with '${expectedPrefix}'` };
    }
    return { valid: true };
  }

  if (allowed.length > 0 && !allowed.some((prefix) => key.startsWith(prefix))) {
    return {
      valid: false,
      message: `Invalid prefix for ${provider}. Expected one of: ${allowed.join(", ")}`,
    };
  }

  return { valid: true };
};

export function useValidation(apiKeys: any[]) {
  const [apiKeyWarning, setApiKeyWarning] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const activeKeys = (apiKeys || []).filter(
      (k) => k && typeof k.key === 'string' && k.key.trim().length > 5 && !k.key.startsWith('dummy') && !k.key.startsWith('your_')
    );

    if (apiKeys && apiKeys.length > 0 && activeKeys.length === 0) {
      // User has entries but none are validly configured keys
      setApiKeyWarning(null);
      return;
    }

    if (!apiKeys || apiKeys.length === 0) {
      setApiKeyWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await Promise.all(
          activeKeys.map(async (keyObj) => {
            try {
              const res = await geminiService.checkKey(
                keyObj.key,
                keyObj.provider as any,
              );
              return { id: keyObj.id, valid: res.valid, error: res.error, name: keyObj.name };
            } catch (err: any) {
              return { id: keyObj.id, valid: false, error: err?.message, name: keyObj.name };
            }
          }),
        );

        if (!isMounted) return;

        // Ignore 429 rate limits or temporary network issues from causing false invalid warnings
        const invalid = results.filter(
          (r) => !r.valid && !r.error?.toLowerCase().includes('rate limit') && !r.error?.includes('429')
        );

        if (invalid.length > 0) {
          setApiKeyWarning(
            `CAUTION: API Key "${invalid[0].name}" failed verification probe (${invalid[0].error || 'Invalid'}). Update it in configurations.`,
          );
        } else {
          setApiKeyWarning(null);
        }
      } catch (err) {
        console.warn("Telemetry key scan skipped", err);
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [JSON.stringify(apiKeys?.map(k => ({ id: k.id, key: k.key, provider: k.provider })))]);

  return { apiKeyWarning, setApiKeyWarning };
}
