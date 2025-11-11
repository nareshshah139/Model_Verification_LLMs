import type { CodeFacts, CardFacts, Discrepancy } from "@shared/index";

export function compareFacts(code: CodeFacts, card: CardFacts): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];
  // Example rule: objective mismatch
  if (code.objective && card.objective && code.objective !== card.objective) {
    discrepancies.push({
      category: "objective",
      severity: "med",
      description: `Objective differs: code=${code.objective} card=${card.objective}`,
      source: "rule",
    });
  }
  return discrepancies;
}

