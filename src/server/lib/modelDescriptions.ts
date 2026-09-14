/**
 * Canonical full model descriptions and intelligent completion engine for AI models.
 * Replaces truncated upstream descriptions ending with "..." or "…" with rich, complete,
 * grammatically sound documentation.
 */

export interface CanonicalModelDescription {
  id: string;
  description: string;
}

export const EXACT_MODEL_DESCRIPTIONS: Record<string, string> = {
  // Poolside Laguna Models (flagship coding agent series)
  'poolside/laguna-m.1': 'Laguna M.1 is the flagship coding agent model from [Poolside](https://poolside.ai/), optimized for complex software engineering tasks. Designed for agentic coding workflows, it supports tool calling and reasoning, with a 256K token context window for analyzing large codebases, multi-file editing, and autonomous debugging across modern software engineering stacks.',
  'poolside/laguna-m.1:free': 'Laguna M.1 is the flagship coding agent model from [Poolside](https://poolside.ai/), optimized for complex software engineering tasks. Designed for agentic coding workflows, it supports tool calling and reasoning, with a 256K token context window for analyzing large codebases, multi-file editing, and autonomous debugging across modern software engineering stacks.',
  'poolside/laguna-xs.2': 'Laguna XS.2 is the second-generation model in the XS size class from [Poolside](https://poolside.ai/), their efficient coding agent series. It combines tool calling and reasoning capabilities with a compact footprint, offering ultra-low latency inference, high throughput, and reliable code generation across a 256K token context window.',
  'poolside/laguna-xs.2:free': 'Laguna XS.2 is the second-generation model in the XS size class from [Poolside](https://poolside.ai/), their efficient coding agent series. It combines tool calling and reasoning capabilities with a compact footprint, offering ultra-low latency inference, high throughput, and reliable code generation across a 256K token context window.',
  'poolside/laguna-xs-2.1': 'Laguna XS 2.1 is the latest coding agent model in the 33B-A3B category from [Poolside](https://poolside.ai/) and a step forward from their Laguna XS.2 model. It combines efficient parameter activation with advanced tool use, multi-file code editing, and rapid reasoning across a 256K token context window.',
  'poolside/laguna-xs-2.1:free': 'Laguna XS 2.1 is the latest coding agent model in the 33B-A3B category from [Poolside](https://poolside.ai/) and a step forward from their Laguna XS.2 model. It combines efficient parameter activation with advanced tool use, multi-file code editing, and rapid reasoning across a 256K token context window.',
  'poolside/laguna-s-2.1': 'Laguna S 2.1 is the latest coding agent model from [Poolside](https://poolside.ai/). Laguna S 2.1 is a 118B total parameter model with 8B active parameters, scoring 70.2% on Terminal-Bench 2.1 and offering state-of-the-art software engineering capabilities with a 1M token context window for large repository ingestion and autonomous execution.',
  'poolside/laguna-s-2.1:free': 'Laguna S 2.1 is the latest coding agent model from [Poolside](https://poolside.ai/). Laguna S 2.1 is a 118B total parameter model with 8B active parameters, scoring 70.2% on Terminal-Bench 2.1 and offering state-of-the-art software engineering capabilities with a 1M token context window for large repository ingestion and autonomous execution.',

  // Anthropic Claude Family
  'anthropic/claude-opus-4.8:batch': "Claude Opus 4.8 is Anthropic's most capable generally available model in the Opus family. It supports text, image, and file inputs with text output, advanced reasoning support, and a 1M-token context window for repository-scale comprehension, strategic architecture planning, and complex multi-step refactoring.",
  'anthropic/claude-3.7-sonnet': "Claude 3.7 Sonnet is Anthropic's flagship hybrid reasoning model, combining instantaneous response generation with extended, transparent test-time reasoning. It excels at complex software engineering, multi-turn coding agent tasks, full-stack architecture design, and tool execution.",
  'anthropic/claude-3.7-sonnet:thinking': "Claude 3.7 Sonnet (Thinking) enables Anthropic's explicit chain-of-thought reasoning process, giving users and developer tools granular visibility into intermediate cognitive steps before producing code, architectural plans, and critical decisions.",
  'anthropic/claude-3.5-sonnet': "Claude 3.5 Sonnet sets industry benchmarks for coding and reasoning. With exceptional visual processing, 200K token context window, and native function calling, it is widely utilized for complex agentic workflows, refactoring, and full-stack software development.",
  'anthropic/claude-3.5-sonnet:beta': "Claude 3.5 Sonnet Beta provides early access to Anthropic's latest model checkpoints with upgraded tool execution capabilities and agentic reasoning enhancements.",
  'anthropic/claude-3.5-haiku': "Claude 3.5 Haiku is Anthropic's fastest model, offering rapid response generation and near-Sonnet coding intelligence at a fraction of the latency and cost, ideal for high-throughput agents, autocomplete, and automated triage.",
  'anthropic/claude-3-opus': "Claude 3 Opus is Anthropic's premium foundation model designed for open-ended analysis, highly complex multi-step reasoning, and intricate software development problems.",

  // Google Gemini Family
  'google/gemini-3.8-flash': 'Gemini 3.8 Flash is Google DeepMind’s next-generation multimodal model engineered for high-velocity agentic workflows, long-context reasoning up to 1M tokens, low-latency function calling, and full-stack code synthesis.',
  'google/gemini-3.8-flash:batch': 'Gemini 3.8 Flash (Batch) provides high-throughput batch processing for large-scale code indexing, repository analysis, and automated evaluation tasks with cost-optimized inference.',
  'google/gemini-3.7-flash': 'Gemini 3.7 Flash is Google DeepMind’s cutting-edge reasoning model featuring native dynamic thinking, strong multimodal comprehension, and rapid code generation across complex software repositories.',
  'google/gemini-2.0-flash-001': 'Gemini 2.0 Flash is Google’s production-grade multimodal model delivering exceptional speed, 1M token context window, and robust tool-use capabilities across diverse development and agent tasks.',
  'google/gemini-2.0-pro-exp-02-05:free': 'Gemini 2.0 Pro Experimental is Google’s most capable developer model, purpose-built for coding, mathematical reasoning, and complex multi-turn logic.',
  'google/gemini-1.5-pro': 'Gemini 1.5 Pro features a breakthrough 2M token context window, allowing entire codebases, audio, video, and comprehensive documentation to be analyzed simultaneously in a single prompt.',

  // OpenAI Family
  'openai/gpt-4o': 'GPT-4o ("omni") is OpenAI’s flagship multimodal model integrating voice, vision, and text natively with high speed, 128K context window, and industry-leading function calling accuracy for coding assistants.',
  'openai/gpt-4o-mini': 'GPT-4o Mini is OpenAI’s cost-efficient, low-latency model designed for fast reasoning, high-volume automated tools, and everyday coding assistance.',
  'openai/gpt-4.5-preview': 'GPT-4.5 Preview is OpenAI’s massive foundation model with unprecedented world knowledge, reduced hallucination rates, and superior creative and analytical problem solving.',
  'openai/o1': 'OpenAI o1 is a specialized reasoning model trained with reinforcement learning to spend more time thinking before answering, excelling at competitive programming, complex algorithms, and deep architectural design.',
  'openai/o3-mini': 'OpenAI o3-mini is a lightweight, cost-effective reasoning model offering high-precision STEM, math, and coding performance with customizable reasoning effort levels.',
  'openai/o4-mini': 'OpenAI o4-mini continues OpenAI’s compact reasoning architecture, offering fast step-by-step thinking for code generation and multi-step agent planning.',

  // DeepSeek Family
  'deepseek/deepseek-r1': 'DeepSeek-R1 is an open-weights reasoning model utilizing large-scale reinforcement learning without supervised fine-tuning as a cold start, delivering competitive performance on code, math, and logic benchmarks with full thinking tokens output.',
  'deepseek/deepseek-r1:free': 'DeepSeek-R1 (Free) provides open-weights reasoning capabilities, delivering deep chain-of-thought problem solving for programming, algorithmic challenges, and mathematical proofs.',
  'deepseek/deepseek-v3': 'DeepSeek-V3 is a 671B parameter Mixture-of-Experts (MoE) model with 37B active parameters per token, optimized for high throughput, exceptional code generation, and low inference cost.',
  'deepseek/deepseek-coder': 'DeepSeek Coder is a dedicated code generation model trained on trillions of code and documentation tokens across over 80 programming languages.',

  // Meta Llama Family
  'meta-llama/llama-3.3-70b-instruct': 'Llama 3.3 70B Instruct is Meta’s state-of-the-art open model delivering intelligence on par with previous 405B-class models, optimized for enterprise coding, tool use, and 128K context reasoning.',
  'meta-llama/llama-3.1-405b-instruct': 'Llama 3.1 405B Instruct is Meta’s flagship open foundation model, featuring 405 billion parameters capable of complex synthetic data generation, advanced coding, and deep domain analysis.',
  'meta-llama/llama-3.1-70b-instruct': 'Llama 3.1 70B Instruct offers robust multi-lingual and programming performance with 128K context window and native tool calling integration.',
  'meta-llama/llama-3.1-8b-instruct': 'Llama 3.1 8B Instruct is a lightweight, highly capable model suited for edge execution, quick code completions, and automated triage.',

  // Mistral AI Family
  'mistralai/mistral-large-2411': 'Mistral Large 2411 is Mistral AI’s premier reasoning and coding model with a 128K context window, native function calling, and first-class multilingual fluency across French, German, Spanish, and English.',
  'mistralai/codestral-2501': 'Codestral is Mistral AI’s dedicated coding model fluent in more than 80 programming languages, tailored for code completion, unit test generation, and repository navigation.',
  'mistralai/mistral-small-24b-instruct-2501': 'Mistral Small 24B is a highly efficient model offering strong reasoning, structured outputs, and swift tool execution with minimal resource footprint.',

  // Qwen Family
  'qwen/qwen3-coder': 'Qwen3-Coder-480B-A35B-Instruct is a Mixture-of-Experts (MoE) code generation model developed by the Qwen team. It is optimized for agentic coding tasks such as function calling, tool use, and long-context reasoning over large repositories and complex multi-file engineering workflows.',
  'qwen/qwen-2.5-coder-32b-instruct': 'Qwen 2.5 Coder 32B is an open-source code generation powerhouse trained on 5.5 trillion tokens, delivering top-tier performance on code generation, completion, and debugging benchmarks.',

  // x-ai / Grok Family
  'x-ai/grok-4.20': 'Grok 4.20 is a reasoning model from SpaceXAI with industry-leading speed and agentic tool calling capabilities. It combines the lowest hallucination rate on the market with strict prompt adherence, delivering state-of-the-art coding performance, precise tool calling, and high instruction adherence.',
  'x-ai/grok-2': 'Grok 2 is xAI’s frontier language model with real-time world knowledge, advanced visual understanding, and reliable coding capabilities.',

  // IBM Granite Family
  'ibm-granite/granite-4.1-8b': 'Granite 4.1 8B is a dense, decoder-only 8-billion-parameter language model from IBM, part of the Granite 4.1 family. It supports a 131K-token context window and is designed for enterprise tasks, structured data extraction, and reliable coding workflows.',
  'ibm-granite/granite-3-8b-instruct': 'Granite 3 8B Instruct is an enterprise-grade model trained on open and permissively licensed datasets, optimized for enterprise tool integration and code assistance.',

  // MiniMax Family
  'minimax/minimax-m3:free': 'MiniMax-M3 is a multimodal foundation model from MiniMax. It supports text, image, and video inputs with text output, a 1M-token context window, and is suited for long-horizon agentic work, coding, tool execution, and complex system-level problem solving.',
  'minimax/minimax-m2.7:free': 'MiniMax-M2.7 is a next-generation large language model designed for autonomous, real-world productivity and continuous improvement. Built to actively participate in its own evolution, M2.7 integrates advanced agentic capabilities through multi-agent coordination, tool orchestration, and automated iterative refinement.'
};

/**
 * Intelligently completes a truncated description ending in "..." or "…"
 */
export function completeTruncatedDescription(
  desc: string,
  modelInfo?: { id?: string; name?: string; provider?: string; contextLength?: string }
): string {
  if (!desc) return '';
  const trimmed = desc.trim();

  // Check if we have an exact canonical description first
  if (modelInfo?.id && EXACT_MODEL_DESCRIPTIONS[modelInfo.id]) {
    return EXACT_MODEL_DESCRIPTIONS[modelInfo.id];
  }

  // Check without :free suffix if applicable
  if (modelInfo?.id && modelInfo.id.endsWith(':free')) {
    const baseId = modelInfo.id.replace(/:free$/, '');
    if (EXACT_MODEL_DESCRIPTIONS[baseId]) {
      return EXACT_MODEL_DESCRIPTIONS[baseId];
    }
  }

  // If not truncated, return as is
  if (!trimmed.endsWith('...') && !trimmed.endsWith('…')) {
    return trimmed;
  }

  // Remove the trailing ellipsis
  let cleaned = trimmed.replace(/\s*(\.\.\.|…)$/, '').trim();

  // Context window cutoffs like ", with a 256K" or "a 1M-token"
  if (/\bwith a\s+\d+K$/i.test(cleaned)) {
    return cleaned + ' token context window for large codebase analysis, multi-file editing, and autonomous debugging.';
  }
  if (/\bwith a\s+\d+M(-token)?$/i.test(cleaned) || /\ba\s+\d+M-token$/i.test(cleaned)) {
    return cleaned + ' context window for repository-scale comprehension, strategic architecture planning, and complex multi-step refactoring.';
  }
  if (/\b(context window|context length)\b.*(suited for|for|enabling)$/i.test(cleaned)) {
    return cleaned + ' multi-turn reasoning, multi-file code editing, and complex agentic tool execution.';
  }

  // Preposition and conjunction cutoffs
  if (/\b(over|through|for|with|and|by|of)\s*$/i.test(cleaned)) {
    const trailingWord = cleaned.match(/\b(over|through|for|with|and|by|of)\s*$/i)?.[0].trim().toLowerCase();
    if (trailingWord === 'over') return cleaned + ' large repositories and complex multi-file engineering workflows.';
    if (trailingWord === 'through') return cleaned + ' structured tool calling, reasoning traces, and systematic verification.';
    if (trailingWord === 'for') return cleaned + ' advanced software engineering, code generation, and autonomous task execution.';
    if (trailingWord === 'with') return cleaned + ' high accuracy, low latency, and robust instruction-following capabilities.';
    if (trailingWord === 'and') return cleaned + ' high-fidelity tool execution across modern developer toolchains.';
    if (trailingWord === 'by') return cleaned + ' modern agentic architectures with built-in reflection and verification.';
    if (trailingWord === 'of') return cleaned + ' software engineering challenges, coding benchmarks, and system optimizations.';
  }

  // Ending with participle like "delivering", "offering", "supporting", "scoring"
  if (/\b(delivering|offering|supporting|enabling|providing)\s*$/i.test(cleaned)) {
    return cleaned + ' state-of-the-art coding performance, precise tool calling, and high instruction adherence.';
  }
  if (/\b(scoring|ranking|leading)\s*$/i.test(cleaned)) {
    return cleaned + ' near the top of industry benchmarks for code generation and automated reasoning.';
  }

  // Ending on comma
  if (cleaned.endsWith(',')) {
    return cleaned + ' tool execution, and complex system-level problem solving.';
  }

  // Ending on incomplete phrase like "multi-agent"
  if (/\b(multi-agent|autonomous|agentic)\s*$/i.test(cleaned)) {
    return cleaned + ' coordination, tool orchestration, and automated iterative refinement.';
  }

  // Ending on schema or format
  if (/\b(JSON schema|format|syntax)\s*$/i.test(cleaned)) {
    return cleaned + ' definition to guarantee strict structural output conformity.';
  }

  // If already ends with a period, it's a complete sentence
  if (cleaned.endsWith('.')) {
    return cleaned;
  }

  // Default clean completion
  return cleaned + ', optimized for modern software engineering and agentic workflows.';
}
