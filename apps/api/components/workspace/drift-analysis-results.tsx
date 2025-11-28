"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, AlertCircle, Info, TrendingUp, Code, FileCode, GitCompare } from "lucide-react";

type DriftSeed = {
  id: number;
  name: string;
  materialityTier: "T1" | "T2" | "T3";
  modelCard: string;
  repoCode: string;
  rationale: string;
  detected: boolean;
  evidence?: string[];
  severity?: "high" | "medium" | "low";
};

type DriftResults = {
  totalChanges: number;
  affectedCategories: string[];
  drifts: DriftSeed[];
  summary: {
    t1Count: number;
    t2Count: number;
    t3Count: number;
  };
  codeComparison?: {
    addedLines: number;
    removedLines: number;
    modifiedCells: number;
  };
};

type Props = {
  results: DriftResults;
};

const MATERIALITY_INFO = {
  T1: {
    label: "Tier 1 - Critical",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950",
    borderColor: "border-red-200 dark:border-red-800",
    icon: AlertTriangle,
    description: "Material impact on model behavior, predictions, and business outcomes"
  },
  T2: {
    label: "Tier 2 - Significant",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: AlertCircle,
    description: "Affects model performance metrics and explainability"
  },
  T3: {
    label: "Tier 3 - Minor",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: Info,
    description: "Cosmetic or operational changes with negligible impact"
  }
};

export function DriftAnalysisResults({ results }: Props) {
  const [selectedTier, setSelectedTier] = useState<"all" | "T1" | "T2" | "T3">("all");

  const filteredDrifts = selectedTier === "all" 
    ? results.drifts 
    : results.drifts.filter(d => d.materialityTier === selectedTier);

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case "T1": return "destructive";
      case "T2": return "default";
      case "T3": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-6 flex-shrink-0">
          <TabsList>
            <TabsTrigger value="overview">
              <TrendingUp className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="drifts">
              <GitCompare className="h-4 w-4 mr-2" />
              Detected Drifts
              {results.totalChanges > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {results.totalChanges}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="code">
              <Code className="h-4 w-4 mr-2" />
              Code Changes
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="flex-1 m-0 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* T1 Card */}
                <Card className={`${MATERIALITY_INFO.T1.bgColor} ${MATERIALITY_INFO.T1.borderColor} border-2`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className={`h-4 w-4 ${MATERIALITY_INFO.T1.color}`} />
                      Tier 1 - Critical
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${MATERIALITY_INFO.T1.color}`}>
                      {results.summary.t1Count}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Material impact on predictions
                    </p>
                  </CardContent>
                </Card>

                {/* T2 Card */}
                <Card className={`${MATERIALITY_INFO.T2.bgColor} ${MATERIALITY_INFO.T2.borderColor} border-2`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertCircle className={`h-4 w-4 ${MATERIALITY_INFO.T2.color}`} />
                      Tier 2 - Significant
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${MATERIALITY_INFO.T2.color}`}>
                      {results.summary.t2Count}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Affects performance metrics
                    </p>
                  </CardContent>
                </Card>

                {/* T3 Card */}
                <Card className={`${MATERIALITY_INFO.T3.bgColor} ${MATERIALITY_INFO.T3.borderColor} border-2`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Info className={`h-4 w-4 ${MATERIALITY_INFO.T3.color}`} />
                      Tier 3 - Minor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${MATERIALITY_INFO.T3.color}`}>
                      {results.summary.t3Count}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Cosmetic changes only
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Materiality Tier Descriptions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Materiality Tier Definitions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(MATERIALITY_INFO).map(([tier, info]) => {
                    const Icon = info.icon;
                    return (
                      <div key={tier} className={`p-3 rounded-lg border ${info.bgColor} ${info.borderColor}`}>
                        <div className="flex items-start gap-3">
                          <Icon className={`h-5 w-5 mt-0.5 ${info.color}`} />
                          <div className="flex-1">
                            <div className={`font-semibold text-sm ${info.color}`}>
                              {info.label}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {info.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Affected Categories */}
              {results.affectedCategories.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Affected Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {results.affectedCategories.map((category, idx) => (
                        <Badge key={idx} variant="outline">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Drifts Tab */}
        <TabsContent value="drifts" className="flex-1 m-0 min-h-0 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Filter Bar */}
            <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/30">
              <span className="text-sm font-medium">Filter by tier:</span>
              <div className="flex gap-1">
                <Badge
                  variant={selectedTier === "all" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedTier("all")}
                >
                  All ({results.drifts.length})
                </Badge>
                <Badge
                  variant={selectedTier === "T1" ? "destructive" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedTier("T1")}
                >
                  T1 ({results.summary.t1Count})
                </Badge>
                <Badge
                  variant={selectedTier === "T2" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedTier("T2")}
                >
                  T2 ({results.summary.t2Count})
                </Badge>
                <Badge
                  variant={selectedTier === "T3" ? "secondary" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedTier("T3")}
                >
                  T3 ({results.summary.t3Count})
                </Badge>
              </div>
            </div>

            {/* Drift List */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-4">
                {filteredDrifts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileCode className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm">No drifts detected in this tier</p>
                  </div>
                ) : (
                  filteredDrifts.map((drift) => {
                    const tierInfo = MATERIALITY_INFO[drift.materialityTier];
                    const Icon = tierInfo.icon;
                    
                    return (
                      <Card key={drift.id} className={`${tierInfo.borderColor} border-l-4`}>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={getTierBadgeVariant(drift.materialityTier)}>
                                  {drift.materialityTier}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Drift #{drift.id}
                                </span>
                              </div>
                              <CardTitle className="text-base flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${tierInfo.color}`} />
                                {drift.name}
                              </CardTitle>
                            </div>
                            {drift.detected && (
                              <Badge variant="destructive" className="shrink-0">
                                Detected
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-1">
                                Model Card
                              </div>
                              <div className={`text-sm p-2 rounded ${tierInfo.bgColor} font-mono`}>
                                {drift.modelCard}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-1">
                                Repo Code
                              </div>
                              <div className={`text-sm p-2 rounded ${tierInfo.bgColor} font-mono`}>
                                {drift.repoCode}
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground mb-1">
                              Rationale
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {drift.rationale}
                            </div>
                          </div>

                          {drift.evidence && drift.evidence.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-1">
                                Evidence
                              </div>
                              <ul className="text-sm space-y-1">
                                {drift.evidence.map((ev, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-muted-foreground">•</span>
                                    <span className="font-mono text-xs">{ev}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Code Changes Tab */}
        <TabsContent value="code" className="flex-1 m-0 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {results.codeComparison ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Code Change Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            +{results.codeComparison.addedLines}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Lines Added</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            -{results.codeComparison.removedLines}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Lines Removed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {results.codeComparison.modifiedCells}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Cells Modified</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Analysis Details</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <p>
                        The modified notebook contains structural changes that may indicate drift from the baseline.
                        Review the detected drifts in the "Detected Drifts" tab for detailed analysis.
                      </p>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
                    <div className="text-center">
                      <Code className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p className="text-sm">Code comparison data not available</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

