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
    const checkKeysUsability = async () => {
      if (apiKeys.length === 0) {
        setApiKeyWarning(
          "CAUTION: No API keys are currently configured. Connect a Google gateway key in settings to unlock custom capabilities.",
        );
        return;
      }
      try {
        const results = await Promise.all(
          apiKeys.map(async (keyObj) => {
            try {
              const res = await geminiService.checkKey(
                keyObj.key,
                keyObj.provider as any,
              );
              return { id: keyObj.id, valid: res.valid, name: keyObj.name };
            } catch (err) {
              return { id: keyObj.id, valid: false, name: keyObj.name };
            }
          }),
        );
        const invalid = results.filter((r) => !r.valid);
        if (invalid.length > 0) {
          setApiKeyWarning(
            `CAUTION: API Key "\${invalid[0].name}" failed verification probe! It may be invalid or expired. Update it in configurations.`,
          );
        } else {
          setApiKeyWarning(null);
        }
      } catch (err) {
        console.warn("Telemetry key scan skipped", err);
      }
    };
    checkKeysUsability();
  }, [apiKeys]);

  return { apiKeyWarning, setApiKeyWarning };
}
