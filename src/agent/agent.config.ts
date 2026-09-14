// Centralized Model and Agent configuration

export const CLASSIFICATION_MODEL = 'gemini-3.1-flash-lite';
export const EMBEDDING_MODEL = 'gemini-embedding-2-preview';
export const DEFAULT_CHAT_MODEL = 'gemini-3.8-flash';
export const FALLBACK_CHAT_MODEL = 'gemini-3.1-flash-lite';
export const PRO_CHAT_MODEL = 'gemini-3.1-pro-preview';
export const FLASH_3_8_CHAT_MODEL = 'gemini-3.8-flash';

export const HYBRID_EXECUTION_MODELS: string[] = [
  DEFAULT_CHAT_MODEL,
  PRO_CHAT_MODEL,
  FALLBACK_CHAT_MODEL,
  'gemini-2.5-flash',
  'gemini-2.5-pro'
];

/**
 * Resolves an ordered list of candidate models for hybrid plan execution.
 * If userRequestedModel is specified (and not 'hybrid'), it is placed as the primary candidate.
 * The remainder consists of high-reasoning and high-availability fallback models to prevent
 * locking into a single model if troubles arise.
 */
export function resolveExecutionCandidateModels(userRequestedModel?: string): string[] {
  const requested = (userRequestedModel || '').trim();
  const isHybrid = !requested || requested.toLowerCase() === 'hybrid';
  const primaryModel = !isHybrid ? requested : undefined;

  const candidates: string[] = [
    primaryModel,
    DEFAULT_CHAT_MODEL,
    PRO_CHAT_MODEL,
    FALLBACK_CHAT_MODEL,
    'gemini-2.5-flash',
    'gemini-2.5-pro'
  ].filter((m): m is string => Boolean(m && m.trim() !== ''));

  return Array.from(new Set(candidates));
}

export const THOUGHT_SIGNATURE_MODELS: string[] = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.0-flash-thinking-exp-01-21',
  'gemini-2.0-flash-thinking-exp',
  'gemini-2.0-pro-exp-02-05',
  'gemini-2.0-flash'
];

export function isThoughtSignatureModel(model: string): boolean {
  if (!model) return false;
  const m = model.toLowerCase().replace('models/', '').replace('google/', '').split(':')[0];
  return THOUGHT_SIGNATURE_MODELS.some(known => m.includes(known)) || m.includes('thinking');
}

export function isGeminiThinkingConfigSupported(model: string): boolean {
  if (!model) return false;
  const m = model.toLowerCase().replace('models/', '').replace('google/', '').split(':')[0];
  if (
    m.includes('image') ||
    m.includes('veo') ||
    m.includes('gemma') ||
    m.includes('embedding')
  ) {
    return false;
  }
  return (
    m === 'hybrid' ||
    m.includes('3.8') ||
    m.includes('3.7') ||
    m.includes('3.5') ||
    m.includes('3.1-pro') ||
    m.includes('3.1-flash-lite') ||
    m.includes('2.5-pro') ||
    m.includes('2.5-flash') ||
    m.includes('thinking')
  );
}

export interface ThinkingLevelOption {
  id: string;
  label: string;
  hint: string;
}

export function getSupportedThinkingLevelsForModel(model: string): ThinkingLevelOption[] {
  if (!isGeminiThinkingConfigSupported(model)) return [];
  const m = model.toLowerCase().replace('models/', '').replace('google/', '').split(':')[0];
  const isPro = m.includes('3.1-pro') || m.includes('2.5-pro');
  const isLite = m.includes('flash-lite');

  const options: ThinkingLevelOption[] = [
    { id: "none", label: "Off", hint: "Standard generation without thinking tokens" }
  ];

  // Minimal is supported on Flash & Lite models
  if (!isPro) {
    options.push({ id: "minimal", label: "Minimal", hint: "Ultra-fast lightweight reasoning" });
  }

  options.push(
    { id: "low", label: "Low", hint: "Fast concise reasoning" },
    { id: "medium", label: "Normal", hint: "Balanced reasoning depth" },
    { id: "high", label: "High", hint: "Deep step-by-step reasoning" }
  );

  // XHigh is supported on Flash models & Hybrid
  if (!isPro && !isLite) {
    options.push({ id: "extra_high", label: "XHigh", hint: "Maximum thinking budget (32k tokens)" });
  }

  return options;
}

export interface ThinkingConfigResult {
  thinkingLevel?: string;
  thinkingBudget?: number;
  includeThoughts?: boolean;
}

export function getThinkingConfigForModel(model: string, userLevel?: string): ThinkingConfigResult | undefined {
  if (!model) return undefined;
  if (!isGeminiThinkingConfigSupported(model)) return undefined;

  const m = model.toLowerCase().replace('models/', '').replace('google/', '').split(':')[0];
  const isGemini3 = m.includes('3.8') || m.includes('3.7') || m.includes('3.5') || m.includes('3.1');
  const isPro = m.includes('3.1-pro') || m.includes('2.5-pro');
  
  if (isGemini3) {
    const rawLevel = (userLevel || 'LOW').toUpperCase();
    let level = 'LOW';
    let budget: number | undefined = undefined;
    const isOff = rawLevel === 'NONE' || rawLevel === 'OFF';

    if (rawLevel === 'MINIMAL') {
      level = isPro ? 'LOW' : 'MINIMAL';
    } else if (rawLevel === 'LOW') {
      level = 'LOW';
    } else if (rawLevel === 'NORMAL' || rawLevel === 'MEDIUM') {
      level = 'MEDIUM';
    } else if (rawLevel === 'HIGH') {
      level = 'HIGH';
    } else if (rawLevel === 'EXTRA_HIGH' || rawLevel === 'XHIGH') {
      level = 'HIGH';
      if (!isPro) {
        budget = 32768;
      }
    } else if (isOff) {
      if (m.includes('3.1-flash-lite') || m.includes('3.8') || m.includes('3.7') || m.includes('3.5')) {
        level = 'MINIMAL';
      } else {
        level = 'LOW';
      }
    }

    if (isPro && level === 'MINIMAL') {
      level = 'LOW';
    }

    return {
      thinkingLevel: level,
      ...(budget ? { thinkingBudget: budget } : {}),
      includeThoughts: !isOff
    };
  }

  if (m.includes('thinking') || m.includes('2.5') || m.includes('2.0')) {
    const rawLevel = (userLevel || 'LOW').toUpperCase();
    const isOff = rawLevel === 'NONE' || rawLevel === 'OFF';
    let budget: number | undefined = undefined;
    if (isOff) {
      budget = 0;
    } else if (rawLevel === 'EXTRA_HIGH' || rawLevel === 'XHIGH') {
      budget = 32768;
    } else if (rawLevel === 'HIGH') {
      budget = 16384;
    } else if (rawLevel === 'NORMAL' || rawLevel === 'MEDIUM') {
      budget = 8192;
    } else if (rawLevel === 'LOW') {
      budget = 2048;
    } else if (rawLevel === 'MINIMAL') {
      budget = 1024;
    }

    return {
      ...(budget !== undefined ? { thinkingBudget: budget } : {}),
      includeThoughts: !isOff
    };
  }

  return undefined;
}

