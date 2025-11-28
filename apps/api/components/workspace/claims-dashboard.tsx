"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, AlertTriangle, XCircle, AlertCircle, Info, TrendingUp, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Claim = {
  id: string;
  category: string;
  claim_type: string;
  description: string;
  verification_strategy: string;
  search_queries: string[];
  expected_evidence: string;
};

type ClaimVerification = {
  claim_id: string;
  claim_description: string;
  verification_status: "verified" | "partially_verified" | "not_verified" | "insufficient_evidence" | null;
  confidence_score: number;
  evidence_found: Array<{
    source: string;
    cell_number?: number;
    evidence_type: string;
    evidence_text: string;
    relevance_score: number;
  }>;
  verification_notes: string;
  code_references: string[];
  contradictions: Array<{
    type: string;
    description: string;
    severity: "low" | "medium" | "high";
  }>;
};

type ClaimsData = {
  claims: Claim[];
};

type VerificationData = {
  verification_metadata: {
    verification_timestamp: string;
    verification_engine: string;
    model_card_source: string;
    code_repository: string;
    notebooks_analyzed: string[];
    total_claims_verified: number;
    verification_summary: {
      verified: number;
      partially_verified: number;
      not_verified: number;
      insufficient_evidence: number;
    };
    batches_completed?: Array<{
      batch_number: number;
      claims_range: string;
      date: string;
    }>;
  };
  claim_verifications: ClaimVerification[];
  overall_assessment: {
    summary: string;
    strengths: string[];
    gaps: string[];
    contradictions_found?: string[];
    recommendations: string[];
    risk_level: string;
    risk_rationale: string;
  };
};

type Props = {
  claimsData: ClaimsData | null;
  verificationData: VerificationData | null;
};

// Calculate materiality score (0-100) based on verification status and contradictions
function calculateMateriality(verification: ClaimVerification | undefined): {
  score: number;
  level: "low" | "medium" | "high" | "critical";
  reason: string;
} {
  if (!verification) {
    return {
      score: 100,
      level: "critical",
      reason: "No verification data available",
    };
  }

  let score = 0;
  let reasons: string[] = [];

  // Base score on verification status
  switch (verification.verification_status) {
    case "not_verified":
      score += 70;
      reasons.push("Not verified");
      break;
    case "insufficient_evidence":
      score += 60;
      reasons.push("Insufficient evidence");
      break;
    case "partially_verified":
      score += 40;
      reasons.push("Partially verified");
      break;
    case "verified":
      score += 10;
      break;
  }

  // Add score based on confidence (lower confidence = higher materiality)
  const confidenceScore = verification.confidence_score ?? 0;
  const confidencePenalty = (1 - confidenceScore) * 30;
  score += confidencePenalty;
  if (confidencePenalty > 15) {
    reasons.push(`Low confidence (${(confidenceScore * 100).toFixed(0)}%)`);
  }

  // Add score based on contradictions
  if (verification.contradictions && verification.contradictions.length > 0) {
    verification.contradictions.forEach((c) => {
      if (c?.severity === "high") {
        score += 20;
        reasons.push("High severity issue");
      } else if (c?.severity === "medium") {
        score += 10;
        reasons.push("Medium severity issue");
      } else if (c?.severity) {
        score += 5;
      }
    });
  }

  // Cap at 100
  score = Math.min(100, score);

  // Determine level
  let level: "low" | "medium" | "high" | "critical";
  if (score >= 75) {
    level = "critical";
  } else if (score >= 50) {
    level = "high";
  } else if (score >= 25) {
    level = "medium";
  } else {
    level = "low";
  }

  return {
    score: Math.round(score),
    level,
    reason: reasons.join(", ") || "Fully verified",
  };
}

function getStatusIcon(status: string | null) {
  switch (status) {
    case "verified":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "partially_verified":
      return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    case "not_verified":
      return <XCircle className="h-5 w-5 text-red-600" />;
    case "insufficient_evidence":
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    default:
      return <Info className="h-5 w-5 text-gray-600" />;
  }
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case "verified":
      return <Badge className="bg-green-100 text-green-800 border-green-300">Verified</Badge>;
    case "partially_verified":
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Partial</Badge>;
    case "not_verified":
      return <Badge className="bg-red-100 text-red-800 border-red-300">Not Verified</Badge>;
    case "insufficient_evidence":
      return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Insufficient Evidence</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

function getMaterialityBadge(level: string) {
  switch (level) {
    case "critical":
      return <Badge className="bg-red-600 text-white">Critical Impact</Badge>;
    case "high":
      return <Badge className="bg-orange-500 text-white">High Impact</Badge>;
    case "medium":
      return <Badge className="bg-yellow-500 text-white">Medium Impact</Badge>;
    case "low":
      return <Badge className="bg-green-500 text-white">Low Impact</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

export function ClaimsDashboard({ claimsData, verificationData }: Props) {
  if (!claimsData || !verificationData) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full items-center justify-center">
          <div className="text-center text-muted-foreground">
            <FileText className="mx-auto mb-2 h-12 w-12" />
            <p className="text-sm">No claims or verification data available</p>
            <p className="text-xs mt-1">Run verification to see the dashboard</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create a map of verifications by claim_id
  const verificationMap = new Map<string, ClaimVerification>();
  verificationData.claim_verifications.forEach((v) => {
    verificationMap.set(v.claim_id, v);
  });

  // Group claims by category
  const claimsByCategory = claimsData.claims.reduce((acc, claim) => {
    if (!acc[claim.category]) {
      acc[claim.category] = [];
    }
    acc[claim.category].push(claim);
    return acc;
  }, {} as Record<string, Claim[]>);

  // Calculate summary statistics
  const totalClaims = claimsData.claims.length; // Total claims in claims.json (196)
  const totalClaimsVerified = verificationData.verification_metadata.total_claims_verified; // Claims verified (144)
  const verifiedCount = verificationData.verification_metadata.verification_summary.verified;
  const partialCount = verificationData.verification_metadata.verification_summary.partially_verified;
  const notVerifiedCount = verificationData.verification_metadata.verification_summary.not_verified;
  const insufficientEvidenceCount = verificationData.verification_metadata.verification_summary.insufficient_evidence;
  
  // Count claims without verification data
  const claimsWithoutVerification = totalClaims - verificationMap.size; // 196 - 144 = 52
  const totalNotVerified = notVerifiedCount + insufficientEvidenceCount + claimsWithoutVerification;

  // Calculate materiality statistics
  const materialityStats = claimsData.claims.map((claim) => {
    const verification = verificationMap.get(claim.id);
    return calculateMateriality(verification);
  });

  const criticalCount = materialityStats.filter((m) => m.level === "critical").length;
  const highCount = materialityStats.filter((m) => m.level === "high").length;
  const mediumCount = materialityStats.filter((m) => m.level === "medium").length;
  const lowCount = materialityStats.filter((m) => m.level === "low").length;

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Header Stats */}
          <div>
            <h2 className="text-2xl font-bold mb-2">Model Card Claims Dashboard</h2>
            <div className="text-sm text-muted-foreground mb-4">
              <div className="flex flex-wrap gap-4 items-center">
                <span>Engine: <strong>{verificationData.verification_metadata.verification_engine}</strong></span>
                <span>Source: <strong>{verificationData.verification_metadata.model_card_source}</strong></span>
                <span>Notebooks: <strong>{verificationData.verification_metadata.notebooks_analyzed.length}</strong></span>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 rounded-md font-medium">
                  Progress: {totalClaimsVerified}/{totalClaims} claims verified ({Math.round((totalClaimsVerified/totalClaims)*100)}%)
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{totalClaims}</div>
                    <div className="text-xs text-muted-foreground mt-1">Total Claims</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{verifiedCount}</div>
                    <div className="text-xs text-muted-foreground mt-1">Verified</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">{partialCount}</div>
                    <div className="text-xs text-muted-foreground mt-1">Partial</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">{notVerifiedCount}</div>
                    <div className="text-xs text-muted-foreground mt-1">Not Verified</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">{insufficientEvidenceCount}</div>
                    <div className="text-xs text-muted-foreground mt-1">Insufficient</div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Verification Progress Bar */}
            {claimsWithoutVerification > 0 && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Verification Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {totalClaimsVerified} of {totalClaims} complete
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(totalClaimsVerified/totalClaims)*100}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {claimsWithoutVerification} claims pending verification
                </div>
              </div>
            )}
          </div>

          {/* Batch Completion Info */}
          {verificationData.verification_metadata.batches_completed && 
           verificationData.verification_metadata.batches_completed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Verification Batches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {verificationData.verification_metadata.batches_completed.map((batch, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      Batch {batch.batch_number}: Claims {batch.claims_range} ({batch.date})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Materiality Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Materiality Impact Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                  <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">Critical Impact</div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                  <div className="text-2xl font-bold text-orange-600">{highCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">High Impact</div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                  <div className="text-2xl font-bold text-yellow-600">{mediumCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">Medium Impact</div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="text-2xl font-bold text-green-600">{lowCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">Low Impact</div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="text-sm font-semibold mb-2">Overall Risk Assessment</div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={
                    verificationData.overall_assessment.risk_level === "HIGH" ? "bg-red-600 text-white" :
                    verificationData.overall_assessment.risk_level === "MEDIUM" ? "bg-yellow-600 text-white" :
                    "bg-green-600 text-white"
                  }>
                    {verificationData.overall_assessment.risk_level}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Risk Level</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {verificationData.overall_assessment.risk_rationale}
                </p>
                {claimsWithoutVerification > 0 && (
                  <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded text-xs">
                    ⚠️ <strong>{claimsWithoutVerification} out of {totalClaims} claims</strong> have not been verified yet ({Math.round((claimsWithoutVerification/totalClaims)*100)}% pending).
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Claims by Category */}
          <Tabs defaultValue={Object.keys(claimsByCategory)[0]} className="w-full">
            <TabsList className="w-full justify-start flex-wrap h-auto">
              {Object.keys(claimsByCategory).map((category) => (
                <TabsTrigger key={category} value={category} className="capitalize">
                  {category.replace(/_/g, " ")}
                  <Badge variant="secondary" className="ml-2">
                    {claimsByCategory[category].length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(claimsByCategory).map(([category, claims]) => (
              <TabsContent key={category} value={category} className="space-y-4 mt-4">
                {claims.map((claim) => {
                  const verification = verificationMap.get(claim.id);
                  const materiality = calculateMateriality(verification);

                  return (
                    <Card key={claim.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {verification?.verification_status && getStatusIcon(verification.verification_status)}
                              <CardTitle className="text-base">{claim.id}</CardTitle>
                              {verification?.verification_status && getStatusBadge(verification.verification_status)}
                              {materiality?.level && getMaterialityBadge(materiality.level)}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                              {claim?.description ?? "No description available"}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-center p-3 border rounded-lg">
                            <div className="text-2xl font-bold">
                              {verification?.confidence_score != null ? (verification.confidence_score * 100).toFixed(0) : "N/A"}%
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Confidence</div>
                          </div>
                          <div className="text-center p-3 border rounded-lg">
                            <div className="text-2xl font-bold">{materiality?.score ?? "N/A"}</div>
                            <div className="text-xs text-muted-foreground mt-1">Materiality Score</div>
                          </div>
                          <div className="text-center p-3 border rounded-lg">
                            <div className="text-2xl font-bold">
                              {verification?.evidence_found?.length ?? 0}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Evidence Items</div>
                          </div>
                          <div className="text-center p-3 border rounded-lg">
                            <div className="text-2xl font-bold">
                              {verification?.contradictions?.length ?? 0}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Issues</div>
                          </div>
                        </div>

                        {verification && (
                          <div className="space-y-3">
                            {/* Verification Notes */}
                            <div className="p-3 bg-muted rounded-lg">
                              <div className="text-xs font-semibold mb-1">Verification Notes</div>
                              <p className="text-xs text-muted-foreground">
                                {verification?.verification_notes ?? "No verification notes available"}
                              </p>
                            </div>

                            {/* Materiality Reason */}
                            <div className="p-3 bg-muted rounded-lg border-l-4 border-orange-500">
                              <div className="text-xs font-semibold mb-1">Impact Reason</div>
                              <p className="text-xs text-muted-foreground">
                                {materiality?.reason ?? "No reason provided"}
                              </p>
                            </div>

                            {/* Contradictions */}
                            {verification?.contradictions && verification.contradictions.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-semibold">Issues & Contradictions</div>
                                {verification.contradictions.map((contradiction, idx) => (
                                  <div
                                    key={idx}
                                    className={`p-3 rounded-lg border-l-4 ${
                                      contradiction?.severity === "high"
                                        ? "bg-red-50 dark:bg-red-950/20 border-red-500"
                                        : contradiction?.severity === "medium"
                                        ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500"
                                        : "bg-blue-50 dark:bg-blue-950/20 border-blue-500"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge
                                        variant="outline"
                                        className={
                                          contradiction?.severity === "high"
                                            ? "bg-red-100 text-red-800 border-red-300"
                                            : contradiction?.severity === "medium"
                                            ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                                            : "bg-blue-100 text-blue-800 border-blue-300"
                                        }
                                      >
                                        {contradiction?.severity?.toUpperCase() ?? "UNKNOWN"}
                                      </Badge>
                                      <span className="text-xs font-medium capitalize">
                                        {contradiction?.type?.replace(/_/g, " ") ?? "unknown"}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {contradiction?.description ?? "No description available"}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Code References */}
                            {verification?.code_references && verification.code_references.length > 0 && (
                              <div>
                                <div className="text-xs font-semibold mb-2">Code References</div>
                                <div className="flex flex-wrap gap-2">
                                  {verification.code_references.map((ref, idx) => (
                                    <Badge key={idx} variant="outline" className="font-mono text-xs">
                                      {ref}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {!verification && (
                          <div className="text-center p-4 text-muted-foreground">
                            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-orange-500" />
                            <p className="text-sm font-semibold">This claim has not been verified yet</p>
                            <p className="text-xs mt-2">
                              Run the verification process to analyze this claim against the codebase.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>
            ))}
          </Tabs>

          {/* Overall Assessment */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-semibold mb-2">Summary</div>
                <p className="text-sm text-muted-foreground">
                  {verificationData.overall_assessment.summary}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold mb-2 text-green-600">Strengths</div>
                  <ul className="space-y-1">
                    {verificationData.overall_assessment.strengths.map((strength, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-sm font-semibold mb-2 text-orange-600">Gaps</div>
                  <ul className="space-y-1">
                    {verificationData.overall_assessment.gaps.map((gap, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {verificationData.overall_assessment.contradictions_found && 
               verificationData.overall_assessment.contradictions_found.length > 0 && (
                <div>
                  <div className="text-sm font-semibold mb-2 text-red-600">Contradictions Found</div>
                  <ul className="space-y-1">
                    {verificationData.overall_assessment.contradictions_found.map((contradiction, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span>{contradiction}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="text-sm font-semibold mb-2 text-blue-600">Recommendations</div>
                <ul className="space-y-1">
                  {verificationData.overall_assessment.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

