"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

type VerificationReport = {
  consistency_score?: number;
  claims_spec?: any;
  evidence_table?: Record<string, any[]>;
  metrics_diffs?: Record<string, any>;
  issues?: Array<{
    category: string;
    severity: "error" | "warning" | "info";
    message: string;
    file?: string;
    line?: number;
  }>;
};

type Props = {
  report: VerificationReport;
  type: "model-card" | "notebooks";
};

export function VerificationResults({ report, type }: Props) {
  const score = report.consistency_score ?? 0;
  const evidenceTable = report.evidence_table || {};
  
  // Calculate summary stats
  const totalIssues = Object.values(evidenceTable).reduce(
    (sum, matches) => sum + (Array.isArray(matches) ? matches.length : 0),
    0
  );
  
  const criticalIssues = Object.entries(evidenceTable).reduce(
    (sum, [category, matches]) =>
      sum + (category === "leakage" && Array.isArray(matches) ? matches.length : 0),
    0
  );

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getSeverityIcon = (category: string) => {
    if (category === "leakage") return <XCircle className="h-4 w-4 text-red-500" />;
    if (category === "metrics") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <span>
            {type === "model-card"
              ? "Model Card Verification"
              : "Notebook Verification"}
          </span>
          <Badge variant={score >= 0.8 ? "default" : score >= 0.6 ? "secondary" : "destructive"}>
            {(score * 100).toFixed(1)}% Match
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-4 pr-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
                      {(score * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Consistency Score
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{totalIssues}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Total Findings
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${criticalIssues > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {criticalIssues}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Critical Issues
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Evidence by Category */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Findings by Category</h3>
              {Object.entries(evidenceTable).map(([category, matches]) => {
                if (!Array.isArray(matches) || matches.length === 0) return null;
                
                return (
                  <Card key={category}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {getSeverityIcon(category)}
                        <span className="capitalize">{category}</span>
                        <Badge variant="outline" className="ml-auto">
                          {matches.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {matches.slice(0, 5).map((match: any, idx: number) => (
                          <div
                            key={idx}
                            className="text-xs border-l-2 border-muted pl-3 py-1"
                          >
                            <div className="font-mono text-muted-foreground">
                              {match.file || match.path || "Unknown file"}
                              {match.line && `:${match.line}`}
                            </div>
                            <div className="mt-1">
                              {match.message || match.text || match.matched || "Issue detected"}
                            </div>
                            {match.text && (
                              <pre className="mt-1 bg-muted p-2 rounded text-xs overflow-x-auto">
                                {match.text}
                              </pre>
                            )}
                          </div>
                        ))}
                        {matches.length > 5 && (
                          <div className="text-xs text-muted-foreground italic">
                            ... and {matches.length - 5} more
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Claims Spec */}
            {report.claims_spec && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Extracted Claims</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                    {JSON.stringify(report.claims_spec, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

