import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

export type LLMProvider = "openai" | "anthropic";

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
}

// Runtime configuration that can be set dynamically
let runtimeConfig: LLMConfig | null = null;

/**
 * Set runtime LLM configuration (overrides environment variables)
 */
export function setRuntimeLLMConfig(config: LLMConfig) {
  runtimeConfig = config;
}

/**
 * Clear runtime LLM configuration (revert to environment variables)
 */
export function clearRuntimeLLMConfig() {
  runtimeConfig = null;
}

/**
 * Get the configured LLM provider and model.
 * Priority: Runtime config > Environment variables
 * 
 * Environment variables:
 * - LLM_PROVIDER: "openai" or "anthropic" (default: "openai")
 * - OPENAI_API_KEY: Required if provider is "openai"
 * - ANTHROPIC_API_KEY: Required if provider is "anthropic"
 * - LLM_MODEL: Model name (default: "gpt-4o-mini" for OpenAI, "claude-sonnet-4-5" for Anthropic)
 */
export function getLLMConfig(): LLMConfig {
  // Use runtime config if available
  if (runtimeConfig) {
    return runtimeConfig;
  }

  const provider = (process.env.LLM_PROVIDER || "openai") as LLMProvider;

  if (provider !== "openai" && provider !== "anthropic") {
    throw new Error(
      `Invalid LLM_PROVIDER: ${provider}. Must be "openai" or "anthropic"`
    );
  }

  // Validate API keys
  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when LLM_PROVIDER=openai");
  }

  if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic");
  }

  // Get model name with defaults (use latest models)
  const defaultModel =
    provider === "openai"
      ? "gpt-4o-mini"
      : "claude-sonnet-4-5";
  const model = process.env.LLM_MODEL || defaultModel;

  return { provider, model };
}

/**
 * Get the LanguageModel instance based on the configured provider.
 */
export function getLLMModel(): LanguageModel {
  const config = getLLMConfig();

  if (config.provider === "openai") {
    // Use runtime API key if provided, otherwise fall back to env
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    return openai(config.model, { apiKey });
  } else {
    // Use runtime API key if provided, otherwise fall back to env
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    return anthropic(config.model, { apiKey });
  }
}

/**
 * Get available models for a provider.
 * Updated to include latest Claude 4.x models.
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
  } else {
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
  }
}

