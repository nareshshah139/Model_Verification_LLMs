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

