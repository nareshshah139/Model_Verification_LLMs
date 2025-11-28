export type Severity = "low" | "med" | "high";

export interface Discrepancy {
  id?: string;
  category: string;
  severity: Severity;
  description: string;
  evidence?: Record<string, unknown>;
  source: "rule" | "llm";
}

export interface CodeFacts {
  metrics?: string[];
  universe?: string[];
  leverageCap?: number | null;
  riskControls?: string[];
  dataSources?: string[];
  objective?: string | null;
}

export interface CardFacts extends CodeFacts {}

// Claim types for LLM extraction and verification
export interface ClaimLocation {
  file?: string;
  line?: number;
}

export interface Claim {
  id: string;
  text: string;
  category?: string;
  description?: string;
  location?: ClaimLocation;
}

export interface ClaimsPayload {
  claims: Claim[];
}

// API response types for microservices
export interface ApiErrorResponse {
  error: string;
  details?: string;
  status?: number;
}

export interface StreamEvent {
  type: 'progress' | 'complete' | 'error';
  message?: string;
  data?: Record<string, unknown>;
  report?: Record<string, unknown>;
}

