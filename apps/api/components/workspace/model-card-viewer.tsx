"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mammoth from "mammoth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, FileText, FlaskConical } from "lucide-react";
import { VerificationResults } from "./verification-results";
import { useWorkspace } from "./workspace-context";

type Props = {
  path: string;
  type: "markdown" | "docx";
};

export function ModelCardViewer({ path, type }: Props) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "verification">("content");
  
  // Use workspace context for persistent verification state
  const { 
    getVerificationReport, 
    setVerificationReport: saveVerificationReport,
    setNotebookDiscrepancies 
  } = useWorkspace();
  
  // Get verification report from context (persists across mount/unmount)
  const verificationReport = getVerificationReport(path);

  useEffect(() => {
    async function loadContent() {
      setLoading(true);
      setError(null);

      try {
        // Determine if we need to use the API endpoint or can fetch directly
        // Use API endpoint for filesystem paths (contains "Documents" or starts with C:, etc.)
        const isFilesystemPath = path.includes("Documents") || 
                                  path.includes("Users") || 
                                  /^[A-Za-z]:/.test(path) ||
                                  (!path.startsWith("http://") && !path.startsWith("https://") && !path.startsWith("/model-cards/"));
        
        if (type === "markdown") {
          if (isFilesystemPath) {
            // It's a filesystem path, use API endpoint
            const response = await fetch(`/api/modelcards/content?path=${encodeURIComponent(path)}&type=markdown`);
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Failed to load markdown");
            }
            const data = await response.json();
            setContent(data.content);
          } else {
            // It's a URL, fetch directly
            const response = await fetch(path);
            if (!response.ok) {
              throw new Error(`Failed to load markdown: ${response.statusText}`);
            }
            const text = await response.text();
            setContent(text);
          }
        } else if (type === "docx") {
          // For Word documents, always use API endpoint to get the file
          const response = await fetch(`/api/modelcards/content?path=${encodeURIComponent(path)}&type=docx`);
          if (!response.ok) {
            throw new Error(`Failed to load Word document: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setContent(result.value);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load model card");
        console.error("Error loading model card:", err);
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, [path, type]);

  const handleVerifyModelCard = async () => {
    setVerifying(true);
    setError(null);
    
    try {
      // Determine the repo path - adjust this based on your structure
      const repoPath = "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/Lending-Club-Credit-Scoring";
      
      const response = await fetch("/api/verify/model-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelCardPath: path,
          repoPath,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Verification failed");
      }

      // Save to context - persists across unmount
      saveVerificationReport(path, result.report);
      setActiveTab("verification");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      console.error("Verification error:", err);
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyNotebooks = async () => {
    setVerifying(true);
    setError(null);
    
    try {
      // Get all notebooks in the repo
      const repoPath = "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/Lending-Club-Credit-Scoring";
      const notebookPaths = [
        "notebooks/1_data_cleaning_understanding.ipynb",
        "notebooks/2_eda.ipynb",
        "notebooks/3_pd_modeling.ipynb",
        "notebooks/4_lgd_ead_modeling.ipynb",
        "notebooks/5_pd_model_monitoring.ipynb",
      ];
      
      const response = await fetch("/api/verify/notebooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notebookPaths,
          modelCardPath: path,
          repoPath,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Verification failed");
      }

      // Save to context - persists across unmount
      saveVerificationReport(path, result.report);
      
      // Also save notebook-specific discrepancies
      if (result.discrepancies && Array.isArray(result.discrepancies)) {
        for (const disc of result.discrepancies) {
          if (disc.notebookPath && disc.issues) {
            setNotebookDiscrepancies(disc.notebookPath, disc.issues);
          }
        }
      }
      
      setActiveTab("verification");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      console.error("Verification error:", err);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-sm text-muted-foreground">Loading model card...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full items-center justify-center">
          <div className="text-center text-destructive">
            <AlertCircle className="mx-auto mb-2 h-8 w-8" />
            <p className="text-sm font-medium">Error Loading Model Card</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="h-full p-0">
        <div className="flex h-full flex-col">
          <div className="border-b px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
            Model Card:{" "}
            <Badge variant="secondary">{path}</Badge>
            <Badge variant="outline">{type === "markdown" ? "MD" : "DOCX"}</Badge>
            
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleVerifyModelCard}
                disabled={verifying}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                {verifying ? "Verifying..." : "Verify Model Card"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleVerifyNotebooks}
                disabled={verifying}
              >
                <FlaskConical className="h-4 w-4 mr-1" />
                {verifying ? "Verifying..." : "Verify Notebooks"}
              </Button>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
            <div className="border-b px-4">
              <TabsList>
                <TabsTrigger value="content">
                  <FileText className="h-4 w-4 mr-1" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="verification" disabled={!verificationReport}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Verification
                  {verificationReport && (
                    <Badge variant="secondary" className="ml-2">
                      {(verificationReport.consistency_score * 100).toFixed(0)}%
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="content" className="flex-1 m-0 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-6">
              {type === "markdown" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {verificationReport ? (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        ℹ️ Verification Active
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        Content is highlighted based on verification results. Inconsistencies are marked in the text.
                      </div>
                    </div>
                  ) : null}
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                    // Custom styling for markdown elements
                    h1: ({ node, ...props }) => (
                      <h1 className="text-3xl font-bold mb-4 mt-6 first:mt-0" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 className="text-2xl font-semibold mb-3 mt-5" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 className="text-xl font-semibold mb-2 mt-4" {...props} />
                    ),
                    p: ({ node, children, ...props }) => {
                      // Highlight paragraphs that might contain discrepancies
                      const text = String(children);
                      const hasIssue = verificationReport && (
                        text.toLowerCase().includes("algorithm") ||
                        text.toLowerCase().includes("metric") ||
                        text.toLowerCase().includes("model") ||
                        text.toLowerCase().includes("data")
                      );
                      return (
                        <p 
                          className={`mb-4 leading-7 ${hasIssue && verificationReport?.consistency_score < 0.8 ? 'bg-yellow-50 dark:bg-yellow-950/30 px-2 py-1 rounded border-l-4 border-yellow-400' : ''}`} 
                          {...props}
                        >
                          {children}
                        </p>
                      );
                    },
                    ul: ({ node, ...props }) => (
                      <ul className="mb-4 ml-6 list-disc [&>li]:mt-2" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="mb-4 ml-6 list-decimal [&>li]:mt-2" {...props} />
                    ),
                    code: ({ node, inline, children, ...props }) => {
                      const text = String(children);
                      const hasCodeIssue = verificationReport && verificationReport.evidence_table && 
                        Object.values(verificationReport.evidence_table).some((matches: any) => 
                          Array.isArray(matches) && matches.some((m: any) => 
                            m.text && text.includes(m.text)
                          )
                        );
                      return inline ? (
                        <code
                          className={`relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm ${
                            hasCodeIssue ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' : 'bg-muted'
                          }`}
                          {...props}
                        >
                          {children}
                        </code>
                      ) : (
                        <code
                          className={`relative rounded p-4 font-mono text-sm block overflow-x-auto ${
                            hasCodeIssue ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' : 'bg-muted'
                          }`}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    pre: ({ node, ...props }) => (
                      <pre className="mb-4 overflow-x-auto rounded-lg border bg-muted p-4" {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        className="mt-6 border-l-2 border-primary pl-6 italic text-muted-foreground"
                        {...props}
                      />
                    ),
                    table: ({ node, ...props }) => (
                      <div className="my-6 w-full overflow-y-auto">
                        <table className="w-full border-collapse" {...props} />
                      </div>
                    ),
                    th: ({ node, ...props }) => (
                      <th
                        className="border border-border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right"
                        {...props}
                      />
                    ),
                    td: ({ node, ...props }) => (
                      <td
                        className="border border-border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right"
                        {...props}
                      />
                    ),
                  }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="verification" className="flex-1 m-0 min-h-0 overflow-auto p-4">
              {verificationReport ? (
                <VerificationResults report={verificationReport} type="model-card" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Click a verification button to see results
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}

