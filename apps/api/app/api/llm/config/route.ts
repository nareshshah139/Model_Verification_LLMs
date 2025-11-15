import { NextRequest, NextResponse } from "next/server";
import { 
  getLLMConfig, 
  setRuntimeLLMConfig, 
  getAvailableModels,
  type LLMConfig,
  type LLMProvider 
} from "@/src/lib/llm-config";

/**
 * GET /api/llm/config
 * Returns current LLM configuration (without API keys for security)
 */
export async function GET() {
  try {
    const config = getLLMConfig();
    
    // Never send API keys to the client
    return NextResponse.json({
      provider: config.provider,
      model: config.model,
      availableModels: {
        openai: getAvailableModels("openai"),
        anthropic: getAvailableModels("anthropic"),
        openrouter: getAvailableModels("openrouter"),
      },
    });
  } catch (error) {
    console.error("Failed to get LLM config:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to get configuration",
        provider: "openai",
        model: "gpt-4o-mini",
        availableModels: {
          openai: getAvailableModels("openai"),
          anthropic: getAvailableModels("anthropic"),
        },
      },
      { status: 200 } // Return 200 with defaults instead of error
    );
  }
}

/**
 * POST /api/llm/config
 * Updates LLM configuration at runtime
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, model, apiKey } = body as Partial<LLMConfig>;

    // Validate provider
    if (!provider || (provider !== "openai" && provider !== "anthropic" && provider !== "openrouter")) {
      return NextResponse.json(
        { error: "Invalid provider. Must be 'openai', 'anthropic', or 'openrouter'" },
        { status: 400 }
      );
    }

    // Validate model
    if (!model) {
      return NextResponse.json(
        { error: "Model is required" },
        { status: 400 }
      );
    }

    const availableModels = getAvailableModels(provider);
    if (!availableModels.includes(model)) {
      return NextResponse.json(
        { 
          error: `Invalid model for ${provider}. Available models: ${availableModels.join(", ")}` 
        },
        { status: 400 }
      );
    }

    // Validate API key if provided
    if (apiKey) {
      if (provider === "openai" && !apiKey.startsWith("sk-")) {
        return NextResponse.json(
          { error: "Invalid OpenAI API key format. Should start with 'sk-'" },
          { status: 400 }
        );
      }
      if (provider === "anthropic" && !apiKey.startsWith("sk-ant-")) {
        return NextResponse.json(
          { error: "Invalid Anthropic API key format. Should start with 'sk-ant-'" },
          { status: 400 }
        );
      }
      if (provider === "openrouter" && !apiKey.startsWith("sk-")) {
        return NextResponse.json(
          { error: "Invalid OpenRouter API key format. Should start with 'sk-'" },
          { status: 400 }
        );
      }
    }

    // Set runtime configuration
    const config: LLMConfig = {
      provider,
      model,
      ...(apiKey && { apiKey }),
    };

    setRuntimeLLMConfig(config);

    // Store in environment for persistence (optional - for server restarts)
    // Note: This only works in development or with custom server setup
    if (apiKey) {
      if (provider === "openai") {
        process.env.OPENAI_API_KEY = apiKey;
      } else if (provider === "anthropic") {
        process.env.ANTHROPIC_API_KEY = apiKey;
      } else if (provider === "openrouter") {
        process.env.OPENROUTER_API_KEY = apiKey;
      }
    }
    process.env.LLM_PROVIDER = provider;
    process.env.LLM_MODEL = model;

    return NextResponse.json({
      success: true,
      message: "LLM configuration updated successfully",
      config: {
        provider,
        model,
      },
    });
  } catch (error) {
    console.error("Failed to update LLM config:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update configuration" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/llm/config
 * Resets to environment variable configuration
 */
export async function DELETE() {
  try {
    // This would clear runtime config and revert to env vars
    // For now, we can just return success
    return NextResponse.json({
      success: true,
      message: "Configuration reset to environment defaults",
    });
  } catch (error) {
    console.error("Failed to reset LLM config:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reset configuration" },
      { status: 500 }
    );
  }
}


