import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

export type LLMProvider = "openai" | "anthropic" | "openrouter";

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
}

/**
 * Get the configured LLM provider and model from environment variables.
 * Configuration is loaded from the .env file at project root.
 * 
 * Environment variables:
 * - LLM_PROVIDER: "openai", "anthropic", or "openrouter" (default: "openai")
 * - OPENAI_API_KEY: Required if provider is "openai"
 * - ANTHROPIC_API_KEY: Required if provider is "anthropic"
 * - OPENROUTER_API_KEY: Required if provider is "openrouter"
 * - LLM_MODEL: Model name (default varies by provider)
 * 
 * Note: Configuration is read-only. To change settings, edit .env and restart services.
 */
export function getLLMConfig(): LLMConfig {

  const provider = (process.env.LLM_PROVIDER || "openai") as LLMProvider;

  if (provider !== "openai" && provider !== "anthropic" && provider !== "openrouter") {
    throw new Error(
      `Invalid LLM_PROVIDER: ${provider}. Must be "openai", "anthropic", or "openrouter"`
    );
  }

  // Validate API keys
  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when LLM_PROVIDER=openai");
  }

  if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic");
  }

  if (provider === "openrouter" && !process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is required when LLM_PROVIDER=openrouter");
  }

  // Get model name with defaults (use latest models)
  const defaultModel =
    provider === "openai"
      ? "gpt-4o-mini"
      : provider === "anthropic"
      ? "claude-sonnet-4-5"
      : "openai/gpt-4o";  // OpenRouter format
  const model = process.env.LLM_MODEL || defaultModel;

  return { provider, model };
}

/**
 * Get the LanguageModel instance based on the configured provider.
 */
export function getLLMModel(): LanguageModel {
  const config = getLLMConfig();

  if (config.provider === "openai") {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    const client = createOpenAI({ apiKey });
    return client(config.model);
  } else if (config.provider === "anthropic") {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    const client = createAnthropic({ apiKey });
    return client(config.model);
  } else {
    // OpenRouter uses OpenAI-compatible API
    // Add optional app attribution headers (see https://openrouter.ai/docs/quickstart)
    const apiKey = config.apiKey || process.env.OPENROUTER_API_KEY;
    const defaultHeaders: Record<string, string> = {};
    
    const httpReferer = process.env.OPENROUTER_HTTP_REFERER;
    const xTitle = process.env.OPENROUTER_X_TITLE;
    
    if (httpReferer) {
      defaultHeaders["HTTP-Referer"] = httpReferer;
    }
    if (xTitle) {
      defaultHeaders["X-Title"] = xTitle;
    }
    
    const client = createOpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      ...(Object.keys(defaultHeaders).length > 0 && { defaultHeaders }),
    });
    return client(config.model);
  }
}

/**
 * Get available models for a provider.
 * Updated to include latest Claude 4.x models and OpenRouter models.
 */
export function getAvailableModels(provider: LLMProvider): string[] {
  if (provider === "openai") {
    return [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-4",
      "gpt-3.5-turbo",
    ];
  } else if (provider === "anthropic") {
    return [
      // Latest Claude 4.x models (2025)
      "claude-sonnet-4-5",        // Best for coding and agents
      "claude-opus-4-1",          // Most capable reasoning
      "claude-haiku-4-5",         // Fastest, low latency
      // Claude 3.5 models
      "claude-3-5-sonnet-20241022",
      "claude-3-5-sonnet-20240620",
      // Claude 3 models
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ];
  } else {
    // OpenRouter models (using OpenRouter-specific model IDs)
    return [
      // OpenAI models via OpenRouter
      "openai/gpt-5-pro",
      "openai/gpt-5-codex",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "openai/gpt-4-turbo",
      // Anthropic models via OpenRouter
      "anthropic/claude-sonnet-4-5",
      "anthropic/claude-opus-4-1",
      "anthropic/claude-3.5-sonnet",
      "anthropic/claude-3-opus",
      // Other popular models on OpenRouter
      "google/gemini-pro-1.5",
      "meta-llama/llama-3.1-405b-instruct",
      "mistralai/mistral-large",
    ];
  }
}

