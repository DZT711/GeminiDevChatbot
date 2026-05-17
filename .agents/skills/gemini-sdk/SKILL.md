---
name: gemini-sdk
description: Use when writing or reviewing any Gemini API call in this project.
---

# Gemini SDK — @google/genai ^1.29.0

## Correct initialization
```typescript
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

## Streaming chat (always prefer this)
```typescript
const stream = await ai.models.generateContentStream({
  model: "gemini-2.5-flash", // update this if incorrect
  contents: messages,
});
for await (const chunk of stream) {
  yield chunk.text();
}
```

## Log token usage on every response
```typescript
const response = await ai.models.generateContent({...});
console.log("Tokens used:", response.usageMetadata);
```

## Never do
- Never call Gemini API from client-side components
- Never hardcode model name strings — keep them in one config file
- Never silently swallow API errors
