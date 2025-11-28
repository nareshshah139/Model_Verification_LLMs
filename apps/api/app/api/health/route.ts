import { NextResponse } from "next/server";
import { checkServiceHealth } from "@/src/lib/api-utils";

/**
 * Health check endpoint
 * Returns status of the UI and backend microservices
 */
export async function GET() {
  try {
    const services = await checkServiceHealth();
    
    const allHealthy = services.cardcheck.running && services.inspector.running;
    
    return NextResponse.json({
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        ui: {
          status: "healthy",
          version: "1.0.0",
        },
        cardcheck: {
          status: services.cardcheck.running ? "healthy" : "unhealthy",
          url: services.cardcheck.url,
          error: services.cardcheck.error,
        },
        inspector: {
          status: services.inspector.running ? "healthy" : "unhealthy",
          url: services.inspector.url,
          error: services.inspector.error,
        },
      },
      warnings: [
        ...(!services.cardcheck.running ? [
          `CodeAct/CardCheck service is not running at ${services.cardcheck.url}. ` +
          `Start it with: cd services/codeact_cardcheck && python api_server.py`
        ] : []),
        ...(!services.inspector.running ? [
          `Inspector service is not running at ${services.inspector.url}. ` +
          `Start it with: cd services/inspector && python main.py`
        ] : []),
      ],
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

