export interface ExtractedModelSpecs {
  toolCall: "Yes" | "No" | "null";
  parameters: string | "null";
  bestFor: string | "null";
  contextLengthFormatted: string | "null";
  promptCostFormatted: string | "null";
  completionCostFormatted: string | "null";
  releaseNoticeUrl: string | "null";
}

/**
 * Parses and returns the number of parameters (e.g., "3B", "70B", "405B")
 * or literal "null" if unknown / unfetchable.
 */
export function getModelParameters(model: any): string | "null" {
  if (!model) return "null";

  const text = `${model.name || ""} ${model.id || ""} ${model.description || ""} ${model.architecture || ""}`;

  // 1. Look for explicit pattern like "3B-parameter", "70B parameter", "3B-param"
  const explicitParamMatch = text.match(/(\d+(?:\.\d+)?)\s*([BbMmTt])(?:-|\s*)(?:parameter|param|params)\b/i);
  if (explicitParamMatch) {
    return `${explicitParamMatch[1]}${explicitParamMatch[2].toUpperCase()}`;
  }

  // 2. Look for identifier suffixes like "llama-3.1-70b", "qwen-2.5-32b", "gemma-2-9b", "phi-3-mini-3.8b"
  const idMatch = (model.id || "").match(/(?:^|[-_/])(\d+(?:\.\d+)?)([bm])(?:[-_/]|$)/i);
  if (idMatch) {
    return `${idMatch[1]}${idMatch[2].toUpperCase()}`;
  }

  // 3. Check model name
  const nameMatch = (model.name || "").match(/\b(\d+(?:\.\d+)?)\s*([BbMm])\b/i);
  if (nameMatch) {
    return `${nameMatch[1]}${nameMatch[2].toUpperCase()}`;
  }

  // 4. Check description for standalone "XX billion parameters"
  const descBillionMatch = (model.description || "").match(/(\d+(?:\.\d+)?)\s*billion\s+parameters?/i);
  if (descBillionMatch) {
    return `${descBillionMatch[1]}B`;
  }

  return "null";
}

/**
 * Determines tool calling capability ("Yes", "No", or literal "null" if unfetchable)
 */
export function getToolCallingStatus(model: any): "Yes" | "No" | "null" {
  if (!model) return "null";

  // Check explicit boolean
  if (model.canUseTool === true || model.capabilities?.tools === true) {
    return "Yes";
  }

  const id = (model.id || "").toLowerCase();
  const desc = (model.description || "").toLowerCase();

  // Known models with native tool calling
  const toolReadyFamilies = [
    "gpt-4", "gpt-3.5-turbo", "o1", "o3", "claude-3", "gemini-1.5",
    "gemini-2", "gemini-2.5", "gemini-3", "qwen-2.5", "codestral",
    "mistral-large", "command-r", "llama-3.1", "llama-3.2", "llama-3.3"
  ];

  if (toolReadyFamilies.some(fam => id.includes(fam))) {
    return "Yes";
  }

  // Check description hints
  if (desc.includes("function call") || desc.includes("tool call") || desc.includes("tools support") || desc.includes("agentic workflow")) {
    return "Yes";
  }

  if (desc.includes("does not support tools") || desc.includes("text generation only") || desc.includes("base model")) {
    return "No";
  }

  // If explicit false was set in database
  if (model.canUseTool === false && model.id) {
    return "No";
  }

  return "null";
}

/**
 * Infers the primary best use-case for a model, or literal "null" if unfetchable.
 */
export function getModelBestFor(model: any): string | "null" {
  if (!model) return "null";

  const id = (model.id || "").toLowerCase();
  const desc = (model.description || "").toLowerCase();
  const name = (model.name || "").toLowerCase();
  const combined = `${id} ${name} ${desc}`;

  // Structured extraction / Schematron
  if (combined.includes("extraction") || combined.includes("html-to-json") || combined.includes("schema") || combined.includes("json extraction")) {
    return "Structured JSON & High-Volume Data Extraction";
  }

  // Coding & Developer tasks
  if (combined.includes("coder") || combined.includes("coding") || combined.includes("codestral") || combined.includes("code generation") || combined.includes("devin") || combined.includes("software engineering")) {
    return "Code Generation, Refactoring & Engineering";
  }

  // Deep Reasoning / Math
  if (combined.includes("reasoning") || combined.includes("deepseek-r1") || id.includes("o1") || id.includes("o3") || combined.includes("step-by-step thinking") || combined.includes("mathematical proofs")) {
    return "Deep Logic, STEM & Multi-Step Reasoning";
  }

  // Vision & Multimodal
  if (combined.includes("multimodal") || combined.includes("vision") || combined.includes("ocr") || combined.includes("image-to-text") || combined.includes("omni")) {
    return "Multimodal Document & Vision Understanding";
  }

  // High speed / Low latency
  if (combined.includes("flash") || combined.includes("turbo") || combined.includes("throughput") || combined.includes("low latency") || combined.includes("real-time") || combined.includes("lite") || combined.includes("mini")) {
    return "High-Throughput & Low-Latency API Streaming";
  }

  // Conversational & Roleplay
  if (combined.includes("roleplay") || combined.includes("creative writing") || combined.includes("storytelling") || combined.includes("uncensored") || combined.includes("dialogue")) {
    return "Conversational Persona & Creative Writing";
  }

  // Autonomous Agents
  if (combined.includes("agent") || combined.includes("tool use") || combined.includes("function calling")) {
    return "Autonomous Multi-Tool Agent Workflows";
  }

  // Large Scale Enterprise reasoning
  if (combined.includes("opus") || combined.includes("405b") || combined.includes("70b") || combined.includes("pro")) {
    return "Complex Analytical Synthesis & Enterprise Tasks";
  }

  // Extract from description if it says "prioritizes X" or "designed for X"
  const purposeMatch = desc.match(/(?:prioritizes|optimized for|designed for|suited for|ideal for)\s+([^.,;]+)/i);
  if (purposeMatch && purposeMatch[1] && purposeMatch[1].trim().length > 3 && purposeMatch[1].trim().length < 60) {
    const raw = purposeMatch[1].trim();
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  return "null";
}

/**
 * Formats context length or returns "null"
 */
export function formatContextLength(contextLength: any): string | "null" {
  if (!contextLength) return "null";
  const num = Number(contextLength);
  if (isNaN(num) || num <= 0) return "null";
  return num.toLocaleString();
}

/**
 * Formats pricing per 1M tokens or returns "null"
 */
export function formatPricingPer1M(val: any): string | "null" {
  if (val === undefined || val === null) return "null";
  const num = Number(val);
  if (isNaN(num) || num < 0) return "null";
  const cost = num * 1000000;
  // Format cleanly
  if (cost === 0) return "$0.00 / 1M";
  if (cost < 0.01) return `$${cost.toFixed(4)} / 1M`;
  return `$${cost.toFixed(2)} / 1M`;
}

/**
 * Returns the official release notice / announcement URL for the model, or "null" if unavailable.
 */
export function getReleaseNoticeUrl(model: any): string | "null" {
  if (!model) return "null";

  // 1. Check database field first
  const explicitUrl = model.releaseNoticeUrl || model.release_notice_url;
  if (explicitUrl && typeof explicitUrl === "string" && explicitUrl.trim().startsWith("http")) {
    return explicitUrl.trim();
  }

  // 2. Client-side matching for straight model release notes
  const id = (model.id || "").toLowerCase();

  // Google Gemini straight release notes
  if (id.includes("gemini-3.8-flash")) return "https://blog.google/innovation-and-ai/models-and-research/gemini-models/3-8-flash-and-3-8-flash-cyber/";
  if (id.includes("gemini-3.7-flash")) return "https://blog.google/innovation-and-ai/models-and-research/gemini-models/";
  if (id.includes("gemini-2.0-flash-thinking")) return "https://blog.google/technology/google-deepmind/gemini-2-0-flash-thinking-february-2025/";
  if (id.includes("gemini-2.0-flash")) return "https://blog.google/technology/google-deepmind/google-gemini-ai-update-december-2024/";
  if (id.includes("gemini-2.0-pro")) return "https://blog.google/technology/google-deepmind/gemini-2-0-flash-thinking-february-2025/";
  if (id.includes("gemini-1.5-pro")) return "https://blog.google/technology/ai/google-gemini-next-generation-model-february-2024/";
  if (id.includes("gemini-1.5-flash-8b")) return "https://blog.google/technology/developer/gemini-1-5-flash-8b/";
  if (id.includes("gemini-1.5-flash")) return "https://blog.google/technology/developer/gemini-1-5-flash-developer/";
  if (id.includes("gemma-2")) return "https://blog.google/technology/developers/google-gemma-2/";
  if (id.includes("gemma")) return "https://blog.google/technology/developers/gemma-open-models/";

  // OpenAI straight release notes
  if (id.includes("gpt-4o-mini")) return "https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/";
  if (id.includes("gpt-4o") || id.includes("chatgpt-4o-latest")) return "https://openai.com/index/hello-gpt-4o/";
  if (id.includes("gpt-4.5")) return "https://openai.com/index/introducing-gpt-4-5/";
  if (id.includes("o1-mini")) return "https://openai.com/index/openai-o1-mini-advancing-cost-efficient-reasoning/";
  if (id.includes("o1")) return "https://openai.com/index/introducing-openai-o1-preview/";
  if (id.includes("o3-mini") || id.includes("openai/o3")) return "https://openai.com/index/openai-o3-mini/";
  if (id.includes("gpt-4-turbo")) return "https://openai.com/index/new-embedding-models-and-api-updates/";
  if (id.includes("gpt-3.5-turbo")) return "https://openai.com/index/introducing-chatgpt-and-whisper-apis/";

  // Anthropic straight release notes
  if (id.includes("claude-3-7") || id.includes("claude-3.7")) return "https://www.anthropic.com/news/claude-3-7-sonnet";
  if (id.includes("claude-3-5-sonnet") || id.includes("claude-3.5-sonnet")) return "https://www.anthropic.com/news/claude-3-5-sonnet";
  if (id.includes("claude-3-5-haiku") || id.includes("claude-3.5-haiku")) return "https://www.anthropic.com/news/claude-3-5-haiku";
  if (id.includes("claude-3")) return "https://www.anthropic.com/news/claude-3-family";

  // Meta Llama straight release notes
  if (id.includes("llama-3.3")) return "https://ai.meta.com/blog/llama-3-3/";
  if (id.includes("llama-3.2")) return "https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/";
  if (id.includes("llama-3.1")) return "https://ai.meta.com/blog/meta-llama-3-1/";
  if (id.includes("llama-3-") || id.includes("llama-3/")) return "https://ai.meta.com/blog/meta-llama-3/";

  // DeepSeek straight release notes
  if (id.includes("deepseek-r1")) return "https://github.com/deepseek-ai/DeepSeek-R1";
  if (id.includes("deepseek-v3") || id.includes("deepseek-chat")) return "https://github.com/deepseek-ai/DeepSeek-V3";
  if (id.includes("deepseek-coder")) return "https://github.com/deepseek-ai/DeepSeek-Coder-V2";

  // Mistral straight release notes
  if (id.includes("mistral-large")) return "https://mistral.ai/news/mistral-large-2411/";
  if (id.includes("pixtral-12b")) return "https://mistral.ai/news/pixtral-12b/";
  if (id.includes("pixtral-large")) return "https://mistral.ai/news/pixtral-large/";
  if (id.includes("codestral")) return "https://mistral.ai/news/codestral/";
  if (id.includes("mistral-nemo")) return "https://mistral.ai/news/mistral-nemo/";
  if (id.includes("mixtral-8x22b")) return "https://mistral.ai/news/mixtral-8x22b/";
  if (id.includes("mixtral-8x7b")) return "https://mistral.ai/news/mixtral-of-experts/";

  // Qwen straight release notes
  if (id.includes("qwen-2.5-coder") || id.includes("qwen3-coder")) return "https://qwenlm.github.io/blog/qwen2.5-coder-family/";
  if (id.includes("qwen-2.5-vl")) return "https://qwenlm.github.io/blog/qwen2.5-vl/";
  if (id.includes("qwq")) return "https://qwenlm.github.io/blog/qwq-32b-preview/";
  if (id.includes("qwen-2.5") || id.includes("qwen3")) return "https://qwenlm.github.io/blog/qwen2.5/";

  // Other straight release notes
  if (id.includes("phi-4")) return "https://techcommunity.microsoft.com/blog/azurehighperformancecomputingblog/introducing-phi-4-microsoft%E2%80%99s-newest-small-language-model-specializing-in-complex-/4357090";
  if (id.includes("phi-3.5")) return "https://azure.microsoft.com/en-us/blog/announcing-phi-3-5-small-language-models-with-multilingual-and-long-context-capabilities/";
  if (id.includes("nova")) return "https://aws.amazon.com/blogs/aws/introducing-amazon-nova-frontier-intelligence-and-industry-leading-price-performance/";
  if (id.includes("grok-2")) return "https://x.ai/blog/grok-2";
  if (id.includes("command-r-plus")) return "https://cohere.com/blog/command-r-plus-multilingual-rag";
  if (id.includes("command-r")) return "https://cohere.com/blog/command-r";
  if (id.includes("nemotron-70b")) return "https://blogs.nvidia.com/blog/llama-3-1-nemotron-70b/";

  return "null";
}

/**
 * Extracts full specs for display
 */
export function extractModelSpecs(model: any): ExtractedModelSpecs {
  return {
    toolCall: getToolCallingStatus(model),
    parameters: getModelParameters(model),
    bestFor: getModelBestFor(model),
    contextLengthFormatted: formatContextLength(model?.contextLength || model?.contextWindow || model?.context_length),
    promptCostFormatted: formatPricingPer1M(model?.pricing?.prompt),
    completionCostFormatted: formatPricingPer1M(model?.pricing?.completion),
    releaseNoticeUrl: getReleaseNoticeUrl(model),
  };
}
