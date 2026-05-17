import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const createLovableAiGatewayProvider = (lovableApiKey: string) =>
  createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });

// Custom OpenAI-compatible providers (user BYOK)
export const createOpenAIProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "openai",
    baseURL: "https://api.openai.com/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

export const createAnthropicProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "anthropic",
    baseURL: "https://api.anthropic.com/v1",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
  });

export const createGeminiProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
