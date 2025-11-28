import { NextRequest, NextResponse } from "next/server";
import { 
  getLLMConfig, 
  getAvailableModels,
  type LLMProvider 
} from "@/src/lib/llm-config";

/**
 * GET /api/llm/config
 * Returns current LLM configuration from .env (read-only status)
 * Never exposes actual API keys for security
 */
export async function GET() {
  try {
    const config = getLLMConfig();
    
    // Check if API key exists for the current provider
    let hasApiKey = false;
    if (config.provider === "openai") {
      hasApiKey = Boolean(process.env.OPENAI_API_KEY);
    } else if (config.provider === "anthropic") {
      hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
    } else if (config.provider === "openrouter") {
      hasApiKey = Boolean(process.env.OPENROUTER_API_KEY);
    }
    
    // Never send actual API keys to the client
    return NextResponse.json({
      provider: config.provider,
      model: config.model,
      hasApiKey, // Just a boolean indicator
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
        hasApiKey: false,
        availableModels: {
          openai: getAvailableModels("openai"),
          anthropic: getAvailableModels("anthropic"),
          openrouter: getAvailableModels("openrouter"),
        },
      },
      { status: 200 } // Return 200 with defaults instead of error
    );
  }
}

/**
 * POST /api/llm/config
 * DEPRECATED: Configuration is now managed via .env file
 * This endpoint is kept for backward compatibility but returns an informative message
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: "Configuration is now managed via .env file. " +
             "Please edit the .env file at the project root and restart services. " +
             "See UNIFIED_ENV_CONFIG.md for details."
    },
    { status: 400 }
  );
}

/**
 * DELETE /api/llm/config
 * DEPRECATED: Configuration is now managed via .env file
 */
export async function DELETE() {
  return NextResponse.json(
    { 
      error: "Configuration is now managed via .env file. " +
             "Please edit the .env file at the project root and restart services."
    },
    { status: 400 }
  );
}


