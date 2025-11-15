"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type VerificationReport = {
  consistency_score?: number;
  evidence_table?: Record<string, any[]>;
};

function computeSummary(report: VerificationReport | null) {
  const score = report?.consistency_score ?? 0;
  const evidenceTable = report?.evidence_table ?? {};

  const totalIssues = Object.values(evidenceTable).reduce(
    (sum, matches) => sum + (Array.isArray(matches) ? matches.length : 0),
    0
  );

  const criticalIssues = Object.entries(evidenceTable).reduce(
    (sum, [category, matches]) =>
      sum + (category === "leakage" && Array.isArray(matches) ? matches.length : 0),
    0
  );

  return { score, totalIssues, criticalIssues };
}

function getScoreColor(score: number) {
  if (score >= 0.8) return "text-green-600";
  if (score >= 0.6) return "text-yellow-600";
  return "text-red-600";
}

export function VerificationSummary() {
  const [report, setReport] = useState<VerificationReport | null>(null);

  useEffect(() => {
    // Load the most recent verification report from localStorage (if any)
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("verificationReports") : null;
      if (!raw) return;
      const obj = JSON.parse(raw) as Record<string, VerificationReport>;
      const preferredPath = "/model-cards/example_model_card.md";
      const candidate =
        (preferredPath in obj ? obj[preferredPath] : null) ??
        (Object.keys(obj).length ? obj[Object.keys(obj)[0]] : null);
      if (candidate) setReport(candidate);
    } catch {
      // ignore parse errors
    }
  }, []);

  const { score, totalIssues, criticalIssues } = useMemo(() => computeSummary(report), [report]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Model Card Verification</span>
          <Badge variant={score >= 0.8 ? "default" : score >= 0.6 ? "secondary" : "destructive"}>
            {(score * 100).toFixed(1)}% Match
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className={`text-3xl font-bold ${getScoreColor(score)}`}>{(score * 100).toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground mt-1">Consistency Score</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{totalIssues}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Findings</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className={`text-3xl font-bold ${criticalIssues > 0 ? "text-red-600" : "text-green-600"}`}>
                  {criticalIssues}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Critical Issues</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}


