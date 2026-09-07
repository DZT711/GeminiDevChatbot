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
  return (
    m.includes('3.8') ||
    m.includes('3.7') ||
    m.includes('3.1-pro') ||
    m.includes('3.1-flash-lite') ||
    m.includes('2.5-pro') ||
    m.includes('2.5-flash') ||
    m.includes('thinking')
  );
}

export interface ThinkingConfigResult {
  thinkingLevel?: string;
  includeThoughts?: boolean;
}

export function getThinkingConfigForModel(model: string, userLevel?: string): ThinkingConfigResult | undefined {
  if (!model) return undefined;
  const m = model.toLowerCase().replace('models/', '').replace('google/', '').split(':')[0];
  const isGemini3 = m.includes('3.8') || m.includes('3.7') || m.includes('3.1');
  
  if (isGemini3) {
    let level = (userLevel || 'LOW').toUpperCase();
    if (level === 'NONE' || level === 'OFF') {
      if (m.includes('3.1-flash-lite') || m.includes('3.8') || m.includes('3.7')) {
        level = 'MINIMAL';
      } else {
        level = 'LOW';
      }
    }
    if (m.includes('3.1-pro') && level === 'MINIMAL') {
      level = 'LOW';
    }
    return {
      thinkingLevel: level,
      includeThoughts: true
    };
  }

  if (m.includes('thinking') || m.includes('2.5') || m.includes('2.0')) {
    return {
      includeThoughts: true
    };
  }

  return undefined;
}

