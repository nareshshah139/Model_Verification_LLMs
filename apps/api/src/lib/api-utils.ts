/**
 * Defensive API utilities for robust microservice communication
 * Handles JSON parsing errors, service crashes, and malformed responses
 */

import { z } from "zod";

/**
 * Strip markdown code fences from LLM responses
 * LLMs often wrap JSON in ```json ... ``` which breaks JSON.parse
 */
export function stripCodeFences(text: string): string {
  return text
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/```\s*$/im, "")
    .trim();
}

/**
 * Interface for fetch response with defensive checks
 */
export interface DefensiveFetchOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  expectedContentType?: string;
  serviceName?: string;
}

/**
 * Response from defensive fetch with metadata
 */
export interface DefensiveFetchResponse<T> {
  data: T;
  status: number;
  contentType: string;
  rawText: string;
}

/**
 * Make a defensive HTTP request with comprehensive error handling
 * 
 * Features:
 * - Validates HTTP status codes
 * - Checks Content-Type headers
 * - Strips code fences from responses
 * - Logs response previews for debugging
 * - Validates response schema with Zod
 * 
 * @param options Fetch options with defensive checks
 * @param schema Optional Zod schema for response validation
 * @returns Parsed and validated response
 * @throws Error with detailed diagnostics if request fails
 */
export async function defensiveFetch<T>(
  options: DefensiveFetchOptions,
  schema?: z.ZodSchema<T>
): Promise<DefensiveFetchResponse<T>> {
  const {
    url,
    method = "GET",
    headers = {},
    body,
    expectedContentType = "application/json",
    serviceName = url,
  } = options;

  // Make request
  const requestHeaders: Record<string, string> = {
    ...headers,
    Accept: expectedContentType,
  };

  if (body && !headers["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body) {
    requestOptions.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, requestOptions);
  } catch (error) {
    throw new Error(
      `Network error calling ${serviceName}: ${error instanceof Error ? error.message : "Unknown error"}. ` +
      `Is the service running? Check CARDCHECK_API_URL (${url}) and INSPECTOR_URL.`
    );
  }

  // Read response body as text first (allows inspection even if not JSON)
  const rawText = await response.text();
  const contentType = response.headers.get("content-type") || "";

  // Log response preview for debugging
  const preview = rawText.slice(0, 200);
  console.log(
    `[API] ${serviceName} responded: status=${response.status}, ` +
    `content-type=${contentType}, preview="${preview}${rawText.length > 200 ? "..." : ""}"`
  );

  // Check HTTP status
  if (!response.ok) {
    // Try to parse error as JSON, but handle HTML error pages gracefully
    let errorDetails = rawText.slice(0, 500);
    if (rawText.startsWith("<")) {
      errorDetails = "Service returned HTML error page (possible crash or 500). Check service logs.";
    }

    throw new Error(
      `${serviceName} request failed with status ${response.status}: ${errorDetails}`
    );
  }

  // Check Content-Type
  if (!contentType.includes(expectedContentType)) {
    throw new Error(
      `${serviceName} returned unexpected content-type: ${contentType}. ` +
      `Expected: ${expectedContentType}. Body preview: ${rawText.slice(0, 500)}`
    );
  }

  // Parse JSON
  let parsed: unknown;
  try {
    const cleaned = stripCodeFences(rawText);
    parsed = JSON.parse(cleaned);
  } catch (parseError) {
    throw new Error(
      `${serviceName} returned invalid JSON: ${parseError instanceof Error ? parseError.message : "Parse error"}. ` +
      `Body (first 500 chars): ${rawText.slice(0, 500)}`
    );
  }

  // Validate schema if provided
  if (schema) {
    const validation = schema.safeParse(parsed);
    if (!validation.success) {
      throw new Error(
        `${serviceName} response schema validation failed: ${validation.error.message}. ` +
        `Response: ${JSON.stringify(parsed).slice(0, 500)}`
      );
    }
    parsed = validation.data;
  }

  return {
    data: parsed as T,
    status: response.status,
    contentType,
    rawText,
  };
}

/**
 * Parse a single SSE data line defensively
 * Handles code fences and JSON parse errors
 */
export function parseSSEDataLine(line: string): unknown | null {
  if (!line.startsWith("data: ")) {
    return null;
  }

  const payload = line.slice(6).trimStart();
  if (!payload || payload === "[DONE]") {
    return null;
  }

  try {
    const cleaned = stripCodeFences(payload);
    return JSON.parse(cleaned);
  } catch (error) {
    console.warn(`Failed to parse SSE line: ${line.slice(0, 100)}`, error);
    return null;
  }
}

/**
 * Process SSE stream buffer and extract complete events
 * Handles multi-line SSE events correctly
 * 
 * @param buffer Current buffer contents
 * @returns { events: parsed events, remainingBuffer: incomplete data }
 */
export function processSSEBuffer(buffer: string): {
  events: unknown[];
  remainingBuffer: string;
} {
  const events: unknown[] = [];
  let remaining = buffer;

  // Find event boundaries (double newline)
  while (true) {
    const boundaryIndex = remaining.indexOf("\n\n");
    if (boundaryIndex === -1) {
      // No complete event yet
      break;
    }

    // Extract event
    const rawEvent = remaining.slice(0, boundaryIndex);
    remaining = remaining.slice(boundaryIndex + 2);

    // Parse event (join all data: lines)
    const dataLines = rawEvent
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trimStart());

    if (dataLines.length === 0) {
      continue;
    }

    const payloadStr = dataLines.join("\n");
    if (payloadStr === "[DONE]") {
      continue;
    }

    try {
      const cleaned = stripCodeFences(payloadStr);
      const parsed = JSON.parse(cleaned);
      events.push(parsed);
    } catch (error) {
      console.warn(`Failed to parse SSE event: ${payloadStr.slice(0, 100)}`, error);
    }
  }

  return {
    events,
    remainingBuffer: remaining,
  };
}

/**
 * Check if microservices are running
 * Returns diagnostic information about service health
 */
export async function checkServiceHealth(): Promise<{
  cardcheck: { running: boolean; url: string; error?: string };
  inspector: { running: boolean; url: string; error?: string };
}> {
  const cardcheckUrl = process.env.CARDCHECK_API_URL || process.env.CODEACT_API_URL || "http://localhost:8001";
  const inspectorUrl = process.env.INSPECTOR_URL || "http://localhost:8000";

  const checkService = async (url: string, name: string) => {
    try {
      const response = await fetch(url, { 
        method: "GET",
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      return {
        running: response.ok || response.status < 500,
        url,
      };
    } catch (error) {
      return {
        running: false,
        url,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  };

  const [cardcheck, inspector] = await Promise.all([
    checkService(cardcheckUrl, "CardCheck"),
    checkService(inspectorUrl, "Inspector"),
  ]);

  return { cardcheck, inspector };
}

