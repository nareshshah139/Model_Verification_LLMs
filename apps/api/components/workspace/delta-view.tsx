"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileCode, AlertTriangle, CheckCircle, TrendingUp, FileSearch } from "lucide-react";
import { DriftAnalysisResults } from "./drift-analysis-results";

type NotebookInfo = {
  name: string;
  path: string;
};

const BASELINE_NOTEBOOKS: NotebookInfo[] = [
  { name: "Data Cleaning & Understanding", path: "notebooks/1_data_cleaning_understanding.ipynb" },
  { name: "EDA", path: "notebooks/2_eda.ipynb" },
  { name: "PD Modeling", path: "notebooks/3_pd_modeling.ipynb" },
  { name: "LGD/EAD Modeling", path: "notebooks/4_lgd_ead_modeling.ipynb" },
  { name: "PD Model Monitoring", path: "notebooks/5_pd_model_monitoring.ipynb" },
];

export function DeltaView() {
  const [selectedBaseline, setSelectedBaseline] = useState<string>("");
  const [modifiedFile, setModifiedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [driftResults, setDriftResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.ipynb')) {
      setModifiedFile(file);
      setError(null);
    } else {
      setError("Please upload a valid .ipynb notebook file");
      setModifiedFile(null);
    }
  };

  const handleAnalyzeDrift = async () => {
    if (!selectedBaseline || !modifiedFile) {
      setError("Please select a baseline notebook and upload a modified version");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setDriftResults(null);

    try {
      // Read the modified file content
      const fileContent = await modifiedFile.text();
      const modifiedNotebook = JSON.parse(fileContent);

      const response = await fetch("/api/analyze-drift", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baselinePath: selectedBaseline,
          modifiedNotebook,
          repoPath: "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/Lending-Club-Credit-Scoring",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Drift analysis failed");
      }

      const results = await response.json();
      setDriftResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze drift");
      console.error("Drift analysis error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload & Compare
          </CardTitle>
          <CardDescription>
            Select a baseline notebook and upload a modified version to detect drift
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Baseline Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Baseline Notebook</label>
              <Select value={selectedBaseline} onValueChange={setSelectedBaseline}>
                <SelectTrigger>
                  <SelectValue placeholder="Select baseline notebook..." />
                </SelectTrigger>
                <SelectContent>
                  {BASELINE_NOTEBOOKS.map((nb) => (
                    <SelectItem key={nb.path} value={nb.path}>
                      {nb.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBaseline && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileCode className="h-3 w-3" />
                  <span className="font-mono">{selectedBaseline}</span>
                </div>
              )}
            </div>

            {/* Modified File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Modified Notebook</label>
              <div className="flex items-center gap-2">
                <label className="flex-1">
                  <input
                    type="file"
                    accept=".ipynb"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="notebook-upload"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => document.getElementById('notebook-upload')?.click()}
                    type="button"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {modifiedFile ? modifiedFile.name : "Choose File"}
                  </Button>
                </label>
              </div>
              {modifiedFile && (
                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle className="h-3 w-3" />
                  <span>File loaded: {(modifiedFile.size / 1024).toFixed(1)} KB</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button
            onClick={handleAnalyzeDrift}
            disabled={!selectedBaseline || !modifiedFile || analyzing}
            className="w-full"
            size="lg"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {analyzing ? "Analyzing Drift..." : "Analyze Drift & Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {(analyzing || driftResults) && (
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5" />
              Drift Analysis Results
            </CardTitle>
            {driftResults && (
              <CardDescription>
                Detected {driftResults.totalChanges || 0} changes across {driftResults.affectedCategories?.length || 0} drift categories
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            {analyzing ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                  <p className="text-sm font-medium">Analyzing notebook drift...</p>
                  <p className="text-xs text-muted-foreground mt-1">Comparing code, imports, and logic</p>
                </div>
              </div>
            ) : driftResults ? (
              <DriftAnalysisResults results={driftResults} />
            ) : null}
          </CardContent>
        </Card>
      )}

      {!analyzing && !driftResults && (
        <Card className="flex-1">
          <CardContent className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <FileSearch className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">Upload a modified notebook to begin drift analysis</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

