/**
 * Canonical release notices and official announcement articles from AI model providers.
 * Each URL points straight into the specific model's official release note, blog article,
 * or repository launch paper/announcement.
 */

interface ExactReleaseNotice {
  id: string;
  url: string;
}

const EXACT_RELEASE_NOTICES: ExactReleaseNotice[] = [
  // Google Gemini specific release notes
  { id: 'google/gemini-3.8-flash', url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/3-8-flash-and-3-8-flash-cyber/' },
  { id: 'google/gemini-3.8-flash:batch', url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/3-8-flash-and-3-8-flash-cyber/' },
  { id: 'google/gemini-3.7-flash', url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/' },
  { id: 'google/gemini-3.7-flash:batch', url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/' },
  { id: 'google/gemini-2.0-flash-001', url: 'https://blog.google/technology/google-deepmind/google-gemini-ai-update-december-2024/' },
  { id: 'google/gemini-2.0-flash-lite-001', url: 'https://blog.google/technology/google-deepmind/google-gemini-ai-update-december-2024/' },
  { id: 'google/gemini-2.0-flash-exp:free', url: 'https://blog.google/technology/google-deepmind/google-gemini-ai-update-december-2024/' },
  { id: 'google/gemini-2.0-flash-thinking-exp:free', url: 'https://blog.google/technology/google-deepmind/gemini-2-0-flash-thinking-february-2025/' },
  { id: 'google/gemini-2.0-pro-exp-02-05:free', url: 'https://blog.google/technology/google-deepmind/gemini-2-0-flash-thinking-february-2025/' },
  { id: 'google/gemini-1.5-pro', url: 'https://blog.google/technology/ai/google-gemini-next-generation-model-february-2024/' },
  { id: 'google/gemini-1.5-flash', url: 'https://blog.google/technology/developer/gemini-1-5-flash-developer/' },
  { id: 'google/gemini-1.5-flash-8b', url: 'https://blog.google/technology/developer/gemini-1-5-flash-8b/' },

  // OpenAI specific release notes
  { id: 'openai/gpt-4o', url: 'https://openai.com/index/hello-gpt-4o/' },
  { id: 'openai/gpt-4o-2024-05-13', url: 'https://openai.com/index/hello-gpt-4o/' },
  { id: 'openai/gpt-4o-2024-08-06', url: 'https://openai.com/index/hello-gpt-4o/' },
  { id: 'openai/gpt-4o-2024-11-20', url: 'https://openai.com/index/hello-gpt-4o/' },
  { id: 'openai/chatgpt-4o-latest', url: 'https://openai.com/index/hello-gpt-4o/' },
  { id: 'openai/gpt-4o-mini', url: 'https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/' },
  { id: 'openai/gpt-4o-mini-2024-07-18', url: 'https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/' },
  { id: 'openai/gpt-4.5-preview', url: 'https://openai.com/index/introducing-gpt-4-5/' },
  { id: 'openai/gpt-4.5', url: 'https://openai.com/index/introducing-gpt-4-5/' },
  { id: 'openai/gpt-4', url: 'https://openai.com/index/gpt-4-research/' },
  { id: 'openai/gpt-4-0314', url: 'https://openai.com/index/gpt-4-research/' },
  { id: 'openai/gpt-4-1106-preview', url: 'https://openai.com/index/new-models-and-developer-products-announced-at-devday/' },
  { id: 'openai/o1', url: 'https://openai.com/index/introducing-openai-o1-preview/' },
  { id: 'openai/o1-preview', url: 'https://openai.com/index/introducing-openai-o1-preview/' },
  { id: 'openai/o1-mini', url: 'https://openai.com/index/openai-o1-mini-advancing-cost-efficient-reasoning/' },
  { id: 'openai/o3', url: 'https://openai.com/index/openai-o3-mini/' },
  { id: 'openai/o3-mini', url: 'https://openai.com/index/openai-o3-mini/' },
  { id: 'openai/o3-mini-high', url: 'https://openai.com/index/openai-o3-mini/' },
  { id: 'openai/o4-mini', url: 'https://openai.com/index/openai-o4-mini/' },
  { id: 'openai/gpt-4-turbo', url: 'https://openai.com/index/new-embedding-models-and-api-updates/' },
  { id: 'openai/gpt-4-turbo-preview', url: 'https://openai.com/index/new-embedding-models-and-api-updates/' },
  { id: 'openai/gpt-3.5-turbo', url: 'https://openai.com/index/introducing-chatgpt-and-whisper-apis/' },
  { id: 'openai/gpt-audio', url: 'https://openai.com/index/introducing-the-realtime-api/' },
  { id: 'openai/gpt-audio-mini', url: 'https://openai.com/index/introducing-the-realtime-api/' },
  { id: 'openai/gpt-oss-120b', url: 'https://openai.com/index/gpt-oss/' },
  { id: 'openai/gpt-oss-20b', url: 'https://openai.com/index/gpt-oss/' },

  // Anthropic specific release notes
  { id: 'anthropic/claude-3.7-sonnet', url: 'https://www.anthropic.com/news/claude-3-7-sonnet' },
  { id: 'anthropic/claude-3.7-sonnet:thinking', url: 'https://www.anthropic.com/news/claude-3-7-sonnet' },
  { id: 'anthropic/claude-3-7-sonnet', url: 'https://www.anthropic.com/news/claude-3-7-sonnet' },
  { id: 'anthropic/claude-3.5-sonnet', url: 'https://www.anthropic.com/news/claude-3-5-sonnet' },
  { id: 'anthropic/claude-3.5-sonnet:beta', url: 'https://www.anthropic.com/news/claude-3-5-sonnet' },
  { id: 'anthropic/claude-3.5-sonnet-20241022', url: 'https://www.anthropic.com/news/claude-3-5-sonnet' },
  { id: 'anthropic/claude-3.5-haiku', url: 'https://www.anthropic.com/news/claude-3-5-haiku' },
  { id: 'anthropic/claude-3.5-haiku-20241022', url: 'https://www.anthropic.com/news/claude-3-5-haiku' },
  { id: 'anthropic/claude-3-opus', url: 'https://www.anthropic.com/news/claude-3-family' },
  { id: 'anthropic/claude-3-sonnet', url: 'https://www.anthropic.com/news/claude-3-family' },
  { id: 'anthropic/claude-3-haiku', url: 'https://www.anthropic.com/news/claude-3-family' },

  // Meta Llama specific release notes
  { id: 'meta-llama/llama-3.3-70b-instruct', url: 'https://ai.meta.com/blog/llama-3-3/' },
  { id: 'meta-llama/llama-3.2-1b-instruct', url: 'https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/' },
  { id: 'meta-llama/llama-3.2-3b-instruct', url: 'https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/' },
  { id: 'meta-llama/llama-3.2-11b-vision-instruct', url: 'https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/' },
  { id: 'meta-llama/llama-3.2-90b-vision-instruct', url: 'https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/' },
  { id: 'meta-llama/llama-3.1-405b-instruct', url: 'https://ai.meta.com/blog/meta-llama-3-1/' },
  { id: 'meta-llama/llama-3.1-70b-instruct', url: 'https://ai.meta.com/blog/meta-llama-3-1/' },
  { id: 'meta-llama/llama-3.1-8b-instruct', url: 'https://ai.meta.com/blog/meta-llama-3-1/' },
  { id: 'meta-llama/llama-3-70b-instruct', url: 'https://ai.meta.com/blog/meta-llama-3/' },
  { id: 'meta-llama/llama-3-8b-instruct', url: 'https://ai.meta.com/blog/meta-llama-3/' },
  { id: 'meta-llama/llama-guard-3-8b', url: 'https://ai.meta.com/blog/meta-llama-3-1/' },
  { id: 'meta-llama/llama-guard-4-12b', url: 'https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/' },

  // DeepSeek specific release notes
  { id: 'deepseek/deepseek-r1', url: 'https://github.com/deepseek-ai/DeepSeek-R1' },
  { id: 'deepseek/deepseek-r1:free', url: 'https://github.com/deepseek-ai/DeepSeek-R1' },
  { id: 'deepseek/deepseek-chat', url: 'https://github.com/deepseek-ai/DeepSeek-V3' },
  { id: 'deepseek/deepseek-v3', url: 'https://github.com/deepseek-ai/DeepSeek-V3' },
  { id: 'deepseek/deepseek-coder', url: 'https://github.com/deepseek-ai/DeepSeek-Coder-V2' },

  // Mistral AI specific release notes
  { id: 'mistralai/mistral-7b-instruct-v0.1', url: 'https://mistral.ai/news/announcing-mistral-7b/' },
  { id: 'mistralai/mistral-large-2411', url: 'https://mistral.ai/news/mistral-large-2411/' },
  { id: 'mistralai/mistral-medium-3', url: 'https://mistral.ai/news/mistral-medium-3/' },
  { id: 'mistralai/mistral-medium-3.1', url: 'https://mistral.ai/news/mistral-medium-3/' },
  { id: 'mistralai/mistral-medium-3-5', url: 'https://mistral.ai/news/vibe-remote-agents-mistral-medium-3-5/' },
  { id: 'mistralai/mistral-small-24b-instruct-2501', url: 'https://mistral.ai/news/mistral-small-3/' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct', url: 'https://mistral.ai/news/mistral-small-3-1/' },
  { id: 'mistralai/mistral-small-3.2-24b-instruct', url: 'https://mistral.ai/news/mistral-small-3-1/' },
  { id: 'mistralai/mistral-small-2603', url: 'https://mistral.ai/news/mistral-small-4/' },
  { id: 'mistralai/ministral-8b', url: 'https://mistral.ai/news/ministraux/' },
  { id: 'mistralai/ministral-3b-2512', url: 'https://mistral.ai/news/ministraux/' },
  { id: 'mistralai/ministral-8b-2512', url: 'https://mistral.ai/news/ministraux/' },
  { id: 'mistralai/ministral-14b-2512', url: 'https://mistral.ai/news/ministraux/' },
  { id: 'mistralai/pixtral-large-2411', url: 'https://mistral.ai/news/pixtral-large/' },
  { id: 'mistralai/pixtral-12b', url: 'https://mistral.ai/news/pixtral-12b/' },
  { id: 'mistralai/codestral-2501', url: 'https://mistral.ai/news/codestral/' },
  { id: 'mistralai/mistral-saba', url: 'https://mistral.ai/news/mistral-saba/' },
  { id: 'mistralai/mistral-nemo', url: 'https://mistral.ai/news/mistral-nemo/' },
  { id: 'mistralai/mixtral-8x22b-instruct', url: 'https://mistral.ai/news/mixtral-8x22b/' },
  { id: 'mistralai/mixtral-8x7b-instruct', url: 'https://mistral.ai/news/mixtral-of-experts/' },
  { id: 'mistralai/devstral-2512', url: 'https://mistral.ai/news/devstral/' },
  { id: 'mistralai/devstral-medium', url: 'https://mistral.ai/news/devstral/' },
  { id: 'mistralai/devstral-small', url: 'https://mistral.ai/news/devstral/' },
  { id: 'mistralai/voxtral-small-24b-2507', url: 'https://mistral.ai/news/voxtral/' },

  // Qwen specific release notes
  { id: 'qwen/qwen-2.5-coder-32b-instruct', url: 'https://qwenlm.github.io/blog/qwen2.5-coder-family/' },
  { id: 'qwen/qwen-2.5-72b-instruct', url: 'https://qwenlm.github.io/blog/qwen2.5/' },
  { id: 'qwen/qwen-plus', url: 'https://qwenlm.github.io/blog/qwen2.5/' },
  { id: 'qwen/qwen2.5-vl-72b-instruct', url: 'https://qwenlm.github.io/blog/qwen2.5-vl/' },
  { id: 'qwen/qwq-32b-preview', url: 'https://qwenlm.github.io/blog/qwq-32b-preview/' },

  // Perplexity Sonar release notes
  { id: 'perplexity/sonar', url: 'https://www.perplexity.ai/hub/blog/introducing-pplx-api' },
  { id: 'perplexity/sonar-pro', url: 'https://www.perplexity.ai/hub/blog/introducing-pplx-api' },
  { id: 'perplexity/sonar-pro-search', url: 'https://www.perplexity.ai/hub/blog/introducing-pplx-api' },
  { id: 'perplexity/sonar-deep-research', url: 'https://www.perplexity.ai/hub/blog/sonar-deep-research' },
  { id: 'perplexity/sonar-reasoning-pro', url: 'https://www.perplexity.ai/hub/blog/sonar-deep-research' },

  // Microsoft specific release notes
  { id: 'microsoft/wizardlm-2-8x22b', url: 'https://developer.microsoft.com/en-us/blogs/wizardlm-2-large-language-model/' },

  // xAI Grok specific release notes
  { id: 'x-ai/grok-2', url: 'https://x.ai/blog/grok-2' },
  { id: 'x-ai/grok-2-vision', url: 'https://x.ai/blog/grok-2' },
  { id: 'x-ai/grok-beta', url: 'https://x.ai/blog/grok-2' },

  // Cohere specific release notes
  { id: 'cohere/command-r-plus-08-2024', url: 'https://cohere.com/blog/command-r-plus-multilingual-rag' },
  { id: 'cohere/command-r-08-2024', url: 'https://cohere.com/blog/command-r' },

  // Specialized & Community Open Models
  { id: 'ai21/jamba-large-1.7', url: 'https://www.ai21.com/blog/announcing-jamba-1-5' },
  { id: 'allenai/olmo-3-32b-think', url: 'https://allenai.org/blog/olmo' },
  { id: 'gryphe/mythomax-l2-13b', url: 'https://huggingface.co/Gryphe/MythoMax-L2-13b' },
  { id: 'undi95/remm-slerp-l2-13b', url: 'https://huggingface.co/Undi95/ReMM-SLERP-L2-13B' },
  { id: 'anthracite-org/magnum-v4-72b', url: 'https://huggingface.co/anthracite-org/magnum-v4-72b' },
  { id: 'alfredpros/codellama-7b-instruct-solidity', url: 'https://huggingface.co/AlfredPros/CodeLlama-7B-Instruct-Solidity' },
  { id: 'rekaai/reka-edge', url: 'https://www.reka.ai/news/reka-core-flash-edge' },
  { id: 'rekaai/reka-flash-3', url: 'https://www.reka.ai/news/reka-core-flash-edge' },
  { id: 'upstage/solar-pro-3', url: 'https://www.upstage.ai/blog/solar-pro' },
  { id: 'upstage/solar-pro4', url: 'https://www.upstage.ai/blog/solar-pro' },
  { id: 'writer/palmyra-x5', url: 'https://writer.com/blog/palmyra-x-004/' },
  { id: 'inflection/inflection-3-pi', url: 'https://inflection.ai/inflection-2-5' },
  { id: 'inflection/inflection-3-productivity', url: 'https://inflection.ai/inflection-2-5' },
  { id: 'prime-intellect/intellect-3', url: 'https://www.primeintellect.ai/blog/intellect-1' },
];

/**
 * Resolves the straight model release note / announcement URL for a model.
 * If no specific model release note article is known, returns null.
 */
export function resolveModelReleaseNoticeUrl(modelId: string, provider?: string): string | null {
  if (!modelId) return null;
  const cleanId = modelId.trim().toLowerCase();

  // 1. Direct exact match
  const exactMatch = EXACT_RELEASE_NOTICES.find((m) => m.id.toLowerCase() === cleanId);
  if (exactMatch) return exactMatch.url;

  // 2. Google Gemini models family
  if (cleanId.includes('gemini-3.8-flash')) {
    return 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/3-8-flash-and-3-8-flash-cyber/';
  }
  if (cleanId.includes('gemini-3.7-flash') || cleanId.includes('gemini-3-') || cleanId.includes('gemini-3.')) {
    return 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/';
  }
  if (cleanId.includes('gemini-2.0-flash-thinking') || cleanId.includes('gemini-2.0-pro')) {
    return 'https://blog.google/technology/google-deepmind/gemini-2-0-flash-thinking-february-2025/';
  }
  if (cleanId.includes('gemini-2.0-flash')) {
    return 'https://blog.google/technology/google-deepmind/google-gemini-ai-update-december-2024/';
  }
  if (cleanId.includes('gemini-2.5-pro')) {
    return 'https://blog.google/technology/google-deepmind/gemini-2-5-pro/';
  }
  if (cleanId.includes('gemini-2.5-flash')) {
    return 'https://blog.google/technology/google-deepmind/gemini-2-5-flash/';
  }
  if (cleanId.includes('gemini-1.5-pro')) {
    return 'https://blog.google/technology/ai/google-gemini-next-generation-model-february-2024/';
  }
  if (cleanId.includes('gemini-1.5-flash-8b')) {
    return 'https://blog.google/technology/developer/gemini-1-5-flash-8b/';
  }
  if (cleanId.includes('gemini-1.5-flash')) {
    return 'https://blog.google/technology/developer/gemini-1-5-flash-developer/';
  }
  if (cleanId.includes('lyria')) {
    return 'https://deepmind.google/technologies/lyria/';
  }
  if (cleanId.includes('gemma-2')) {
    return 'https://blog.google/technology/developers/google-gemma-2/';
  }
  if (cleanId.includes('gemma')) {
    return 'https://blog.google/technology/developers/gemma-open-models/';
  }
  if (cleanId.startsWith('~google/')) {
    return 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/';
  }

  // 3. OpenAI models family
  if (cleanId.includes('gpt-4o-mini')) {
    return 'https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/';
  }
  if (cleanId.includes('gpt-4o') || cleanId.includes('chatgpt-4o-latest') || cleanId.includes('gpt-chat-latest')) {
    return 'https://openai.com/index/hello-gpt-4o/';
  }
  if (cleanId.includes('gpt-4.5')) {
    return 'https://openai.com/index/introducing-gpt-4-5/';
  }
  if (cleanId.includes('gpt-4.1')) {
    return 'https://openai.com/index/introducing-gpt-4-5/';
  }
  if (cleanId.includes('gpt-5') || cleanId.includes('gpt-6')) {
    return 'https://openai.com/index/introducing-gpt-5/';
  }
  if (cleanId.includes('gpt-audio')) {
    return 'https://openai.com/index/introducing-the-realtime-api/';
  }
  if (cleanId.includes('gpt-oss')) {
    return 'https://openai.com/index/gpt-oss/';
  }
  if (cleanId.includes('o4-mini')) {
    return 'https://openai.com/index/openai-o4-mini/';
  }
  if (cleanId.includes('o3-mini') || cleanId.includes('openai/o3')) {
    return 'https://openai.com/index/openai-o3-mini/';
  }
  if (cleanId.includes('o1-mini')) {
    return 'https://openai.com/index/openai-o1-mini-advancing-cost-efficient-reasoning/';
  }
  if (cleanId.includes('o1')) {
    return 'https://openai.com/index/introducing-openai-o1-preview/';
  }
  if (cleanId.includes('gpt-4-turbo') || cleanId.includes('gpt-4-1106')) {
    return 'https://openai.com/index/new-models-and-developer-products-announced-at-devday/';
  }
  if (cleanId.includes('gpt-4')) {
    return 'https://openai.com/index/gpt-4-research/';
  }
  if (cleanId.includes('gpt-3.5-turbo')) {
    return 'https://openai.com/index/introducing-chatgpt-and-whisper-apis/';
  }
  if (cleanId.startsWith('~openai/')) {
    return 'https://openai.com/index/hello-gpt-4o/';
  }

  // 4. Anthropic Claude models family
  if (cleanId.includes('claude-3-7-sonnet') || cleanId.includes('claude-3.7-sonnet')) {
    return 'https://www.anthropic.com/news/claude-3-7-sonnet';
  }
  if (cleanId.includes('claude-3-5-sonnet') || cleanId.includes('claude-3.5-sonnet')) {
    return 'https://www.anthropic.com/news/claude-3-5-sonnet';
  }
  if (cleanId.includes('claude-3-5-haiku') || cleanId.includes('claude-3.5-haiku')) {
    return 'https://www.anthropic.com/news/claude-3-5-haiku';
  }
  if (cleanId.includes('claude-3-opus') || cleanId.includes('claude-3-sonnet') || cleanId.includes('claude-3-haiku')) {
    return 'https://www.anthropic.com/news/claude-3-family';
  }
  if (cleanId.includes('claude-4') || cleanId.includes('claude-5') || cleanId.includes('claude-opus-4') || cleanId.includes('claude-opus-5') || cleanId.includes('claude-sonnet-4') || cleanId.includes('claude-sonnet-5') || cleanId.includes('claude-haiku-4') || cleanId.includes('claude-fable')) {
    return 'https://www.anthropic.com/news/';
  }
  if (cleanId.startsWith('~anthropic/')) {
    return 'https://www.anthropic.com/news/claude-3-7-sonnet';
  }

  // 5. Meta Llama models family
  if (cleanId.includes('llama-guard-4')) {
    return 'https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/';
  }
  if (cleanId.includes('llama-guard-3')) {
    return 'https://ai.meta.com/blog/meta-llama-3-1/';
  }
  if (cleanId.includes('llama-4')) {
    return 'https://ai.meta.com/blog/llama-4/';
  }
  if (cleanId.includes('llama-3.3')) {
    return 'https://ai.meta.com/blog/llama-3-3/';
  }
  if (cleanId.includes('llama-3.2')) {
    return 'https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/';
  }
  if (cleanId.includes('llama-3.1')) {
    return 'https://ai.meta.com/blog/meta-llama-3-1/';
  }
  if (cleanId.includes('llama-3-') || cleanId.includes('llama-3/')) {
    return 'https://ai.meta.com/blog/meta-llama-3/';
  }
  if (cleanId.includes('muse-')) {
    return 'https://ai.meta.com/blog/';
  }

  // 6. DeepSeek models family
  if (cleanId.includes('deepseek-r1')) {
    return 'https://github.com/deepseek-ai/DeepSeek-R1';
  }
  if (cleanId.includes('deepseek-v3') || cleanId.includes('deepseek-chat') || cleanId.includes('deepseek-v4')) {
    return 'https://github.com/deepseek-ai/DeepSeek-V3';
  }
  if (cleanId.includes('deepseek-coder')) {
    return 'https://github.com/deepseek-ai/DeepSeek-Coder-V2';
  }
  if (cleanId.startsWith('~deepseek/')) {
    return 'https://github.com/deepseek-ai/DeepSeek-V3';
  }

  // 7. Mistral AI models family
  if (cleanId.includes('mistral-7b')) {
    return 'https://mistral.ai/news/announcing-mistral-7b/';
  }
  if (cleanId.includes('mistral-large')) {
    return 'https://mistral.ai/news/mistral-large-2411/';
  }
  if (cleanId.includes('mistral-medium-3-5')) {
    return 'https://mistral.ai/news/vibe-remote-agents-mistral-medium-3-5/';
  }
  if (cleanId.includes('mistral-medium-3')) {
    return 'https://mistral.ai/news/mistral-medium-3/';
  }
  if (cleanId.includes('mistral-small-2603')) {
    return 'https://mistral.ai/news/mistral-small-4/';
  }
  if (cleanId.includes('mistral-small-3.1') || cleanId.includes('mistral-small-3.2')) {
    return 'https://mistral.ai/news/mistral-small-3-1/';
  }
  if (cleanId.includes('mistral-small-24b') || cleanId.includes('mistral-small-3')) {
    return 'https://mistral.ai/news/mistral-small-3/';
  }
  if (cleanId.includes('ministral')) {
    return 'https://mistral.ai/news/ministraux/';
  }
  if (cleanId.includes('pixtral-12b')) {
    return 'https://mistral.ai/news/pixtral-12b/';
  }
  if (cleanId.includes('pixtral-large')) {
    return 'https://mistral.ai/news/pixtral-large/';
  }
  if (cleanId.includes('codestral')) {
    return 'https://mistral.ai/news/codestral/';
  }
  if (cleanId.includes('mistral-nemo')) {
    return 'https://mistral.ai/news/mistral-nemo/';
  }
  if (cleanId.includes('mistral-saba')) {
    return 'https://mistral.ai/news/mistral-saba/';
  }
  if (cleanId.includes('devstral')) {
    return 'https://mistral.ai/news/devstral/';
  }
  if (cleanId.includes('voxtral')) {
    return 'https://mistral.ai/news/voxtral/';
  }
  if (cleanId.includes('mixtral-8x22b')) {
    return 'https://mistral.ai/news/mixtral-8x22b/';
  }
  if (cleanId.includes('mixtral-8x7b')) {
    return 'https://mistral.ai/news/mixtral-of-experts/';
  }

  // 8. Qwen models family
  if (cleanId.includes('qwen-2.5-coder') || cleanId.includes('qwen3-coder')) {
    return 'https://qwenlm.github.io/blog/qwen2.5-coder-family/';
  }
  if (cleanId.includes('qwen-2.5-vl') || cleanId.includes('qwen2.5-vl') || cleanId.includes('qwen3-vl')) {
    return 'https://qwenlm.github.io/blog/qwen2.5-vl/';
  }
  if (cleanId.includes('qwq')) {
    return 'https://qwenlm.github.io/blog/qwq-32b-preview/';
  }
  if (cleanId.includes('qwen-2.5') || cleanId.includes('qwen2.5') || cleanId.includes('qwen-plus') || cleanId.includes('tongyi-deepresearch')) {
    return 'https://qwenlm.github.io/blog/qwen2.5/';
  }
  if (cleanId.includes('qwen3') || cleanId.includes('qwen-3')) {
    return 'https://qwenlm.github.io/blog/';
  }

  // 9. Perplexity Sonar models family
  if (cleanId.includes('sonar-deep-research') || cleanId.includes('sonar-reasoning')) {
    return 'https://www.perplexity.ai/hub/blog/sonar-deep-research';
  }
  if (cleanId.includes('sonar')) {
    return 'https://www.perplexity.ai/hub/blog/introducing-pplx-api';
  }

  // 10. xAI Grok models family
  if (cleanId.includes('grok')) {
    return 'https://x.ai/blog/grok-2';
  }
  if (cleanId.startsWith('~x-ai/')) {
    return 'https://x.ai/blog/grok-2';
  }

  // 11. Cohere models family
  if (cleanId.includes('command-r-plus')) {
    return 'https://cohere.com/blog/command-r-plus-multilingual-rag';
  }
  if (cleanId.includes('command-r') || cleanId.includes('command-a') || cleanId.includes('north-mini')) {
    return 'https://cohere.com/blog/command-r';
  }

  // 11b. Arcee AI models family
  if (cleanId.includes('arcee-ai')) {
    return 'https://huggingface.co/arcee-ai';
  }

  // 12. Amazon Nova models family
  if (cleanId.includes('nova')) {
    return 'https://aws.amazon.com/blogs/aws/introducing-amazon-nova-frontier-intelligence-and-industry-leading-price-performance/';
  }

  // 13. NVIDIA models family
  if (cleanId.includes('nemotron')) {
    return 'https://blogs.nvidia.com/blog/llama-3-1-nemotron-70b/';
  }

  // 14. Microsoft models family
  if (cleanId.includes('phi-4')) {
    return 'https://techcommunity.microsoft.com/blog/azurehighperformancecomputingblog/introducing-phi-4-microsoft%E2%80%99s-newest-small-language-model-specializing-in-complex-/4357090';
  }
  if (cleanId.includes('phi-3.5')) {
    return 'https://azure.microsoft.com/en-us/blog/announcing-phi-3-5-small-language-models-with-multilingual-and-long-context-capabilities/';
  }
  if (cleanId.includes('wizardlm-2')) {
    return 'https://developer.microsoft.com/en-us/blogs/wizardlm-2-large-language-model/';
  }

  // 15. Z.ai / Zhipu AI (GLM) family
  if (cleanId.includes('glm-') || cleanId.startsWith('~z-ai/')) {
    return 'https://github.com/THUDM/GLM-4';
  }

  // 16. Moonshot AI (Kimi) family
  if (cleanId.includes('kimi-') || cleanId.startsWith('~moonshotai/')) {
    return 'https://github.com/MoonshotAI/Kimi-k1.5';
  }

  // 17. MiniMax models family
  if (cleanId.includes('minimax-')) {
    return 'https://github.com/MiniMax-AI/MiniMax-01';
  }

  // 18. Liquid AI foundation models
  if (cleanId.includes('lfm-')) {
    return 'https://www.liquid.ai/blog/introducing-liquid-foundation-models';
  }

  // 19. Nous Research Hermes family
  if (cleanId.includes('hermes-')) {
    return 'https://nousresearch.com/hermes-3/';
  }

  // 20. IBM Granite family
  if (cleanId.includes('granite-')) {
    return 'https://www.ibm.com/granite';
  }

  // 21. Inception Labs Mercury family
  if (cleanId.includes('mercury-')) {
    return 'https://www.inceptionlabs.ai/';
  }

  // 22. Tencent Hunyuan family
  if (cleanId.includes('hunyuan') || cleanId.includes('hy-mt2') || cleanId.includes('/hy3') || cleanId.includes('/hy4')) {
    return 'https://github.com/Tencent/HunyuanLarge';
  }

  // 23. ByteDance Seed / Doubao family
  if (cleanId.includes('bytedance') || cleanId.includes('doubao') || cleanId.includes('seed-edit')) {
    return 'https://github.com/volcengine/doubao';
  }

  // 24. Baidu ERNIE & Qianfan family
  if (cleanId.includes('ernie') || cleanId.includes('baidu') || cleanId.includes('qianfan') || cleanId.includes('cobuddy')) {
    return 'https://cloud.baidu.com/article/5084814';
  }

  // 25. InclusionAI Ling family
  if (cleanId.includes('inclusionai') || cleanId.includes('ling-')) {
    return 'https://inclusionai.com/';
  }

  // 26. StepFun family
  if (cleanId.includes('stepfun') || cleanId.includes('step-3')) {
    return 'https://www.stepfun.com/';
  }

  // 27. Sakana AI family
  if (cleanId.includes('sakana') || cleanId.includes('fugu-')) {
    return 'https://sakana.ai/evolutionary-model-merge/';
  }

  // 28. Xiaomi MiMO family
  if (cleanId.includes('mimo-')) {
    return 'https://github.com/Xiaomi/MiMO';
  }

  // 29. Kwaipilot Kat-Coder family
  if (cleanId.includes('kat-coder')) {
    return 'https://github.com/Kwai-Kolors';
  }

  // 30. Open source community fine-tunes
  if (cleanId.includes('thedrummer/')) {
    return 'https://huggingface.co/TheDrummer';
  }
  if (cleanId.includes('dolphin')) {
    return 'https://huggingface.co/cognitivecomputations';
  }
  if (cleanId.includes('poolside') || cleanId.includes('laguna-')) {
    return 'https://poolside.ai/';
  }
  if (cleanId.includes('openrouter/')) {
    return 'https://openrouter.ai/docs#auto-routing';
  }
  if (cleanId.includes('relace/')) {
    return 'https://relace.ai/';
  }
  if (cleanId.includes('thinkingmachines/')) {
    return 'https://thinkingmachines.ai/';
  }
  if (cleanId.includes('morph/')) {
    return 'https://morph.so/';
  }
  if (cleanId.includes('nex-agi/') || cleanId.includes('nex-n2')) {
    return 'https://nex.art/';
  }
  if (cleanId.includes('inference-net/')) {
    return 'https://inference.net/blog';
  }
  if (cleanId.includes('dots-studio/')) {
    return 'https://huggingface.co/dots-studio';
  }
  if (cleanId.includes('essentialai/')) {
    return 'https://essential.ai/';
  }
  if (cleanId.includes('mancer/')) {
    return 'https://mancer.tech/';
  }
  if (cleanId.includes('meituan/')) {
    return 'https://github.com/meituan';
  }
  if (cleanId.includes('aion-labs/')) {
    return 'https://aionlabs.ai/';
  }
  if (cleanId.includes('deepcogito/')) {
    return 'https://deepcogito.com/';
  }
  if (cleanId.includes('switchpoint/')) {
    return 'https://switchpoint.ai/';
  }
  if (cleanId.includes('perceptron/')) {
    return 'https://perceptron.ai/';
  }
  if (cleanId.includes('ox-alpha') || cleanId.includes('stealth')) {
    return 'https://huggingface.co/';
  }

  return null;
}
