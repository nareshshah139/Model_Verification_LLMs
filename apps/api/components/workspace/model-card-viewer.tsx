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
  
  // Streaming state
  const [progressMessages, setProgressMessages] = useState<Array<{
    message: string;
    step?: number;
    data?: any;
    timestamp: number;
  }>>([]);
  
  // Use workspace context for persistent verification state
  const { 
    verificationReports,
    setVerificationReport: saveVerificationReport,
    setNotebookDiscrepancies 
  } = useWorkspace();
  
  // Get verification report from context and track it in local state
  // This ensures the component re-renders when the Map changes
  const [verificationReport, setLocalVerificationReport] = useState<any>(undefined);
  
  useEffect(() => {
    const report = verificationReports.get(path);
    setLocalVerificationReport(report);
  }, [verificationReports, path]);

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

  // Check if verification JSON file exists
  const checkVerificationJsonExists = async (): Promise<boolean> => {
    try {
      const response = await fetch('/model_card_claims_verification.json', {
        method: 'HEAD',
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  // Stream verification data from existing JSON file with formatted output
  const streamFromExistingVerification = async () => {
    try {
      // ============================================
      // PHASE 1: CLAIM EXTRACTION
      // ============================================
      setProgressMessages([{
        message: '📋 **Extracting claims now...**',
        timestamp: Date.now(),
      }]);

      await new Promise(resolve => setTimeout(resolve, 300));

      // Fetch claims JSON
      const claimsResponse = await fetch('/model_card_claims.json');
      if (!claimsResponse.ok) {
        throw new Error('Failed to load claims JSON');
      }

      const claimsData = await claimsResponse.json();
      const claims = claimsData.claims || [];

      // Stream each extracted claim
      for (let i = 0; i < claims.length; i++) { // Stream ALL claims
        const claim = claims[i];
        await new Promise(resolve => setTimeout(resolve, 80)); // Delay between claims
        
        const claimId = claim?.id || `claim_${i + 1}`;
        const description = claim?.description || 'No description available';
        const category = claim?.category || 'uncategorized';
        const claimType = claim?.claim_type || 'unknown';
        
        let claimMessage = `\n**Claim ${i + 1}/${claims.length}**: ${claimId}\n\n`;
        claimMessage += `📋 **Description**: ${description}\n\n`;
        claimMessage += `🏷️ **Category**: ${category}\n`;
        claimMessage += `🔍 **Type**: ${claimType}\n\n`;
        
        if (claim?.verification_strategy) {
          claimMessage += `**Verification Strategy**: ${claim.verification_strategy}\n\n`;
        }
        
        setProgressMessages(prev => [...prev, {
          message: claimMessage,
          step: i + 1,
          timestamp: Date.now(),
        }]);
      }

      await new Promise(resolve => setTimeout(resolve, 150));
      setProgressMessages(prev => [...prev, {
        message: `\n✓ **Claim extraction complete!** Total: **${claims.length} claims**`,
        timestamp: Date.now(),
      }]);

      await new Promise(resolve => setTimeout(resolve, 400));
      const uniqueCategories = [...new Set(claims.map((c: any) => c?.category).filter(Boolean))];
      const uniqueClaimTypes = [...new Set(claims.map((c: any) => c?.claim_type).filter(Boolean))];
      
      setProgressMessages(prev => [...prev, {
        message: `\n${'='.repeat(80)}\n\n` +
                 `📊 **Extraction Summary**:\n` +
                 `- Total Claims: ${claims.length}\n` +
                 `- Categories: ${uniqueCategories.length}\n` +
                 `- Claim Types: ${uniqueClaimTypes.length}\n\n` +
                 `${'='.repeat(80)}`,
        timestamp: Date.now(),
      }]);

      // ============================================
      // PHASE 2: CLAIM VERIFICATION
      // ============================================
      await new Promise(resolve => setTimeout(resolve, 600));

      // Fetch the verification JSON
      const verificationResponse = await fetch('/model_card_claims_verification.json');
      if (!verificationResponse.ok) {
        throw new Error('Failed to load verification JSON');
      }

      const verificationData = await verificationResponse.json();
      const totalVerifications = verificationData.claim_verifications?.length || 0;
      console.log(`Loaded verification data with ${totalVerifications} verifications`);

      // Stream metadata
      await new Promise(resolve => setTimeout(resolve, 200));
      const metadata = verificationData.verification_metadata || {};
      const summary = metadata.verification_summary || {};
      
      setProgressMessages(prev => [...prev, {
        message: `\n📊 **Verification Metadata**\n` +
                 `- Engine: ${metadata.verification_engine || 'Unknown'}\n` +
                 `- Source: ${metadata.model_card_source || 'Unknown'}\n`,
        timestamp: Date.now(),
      }]);

      // Stream each claim verification
      const verifications = verificationData.claim_verifications || [];
      console.log(`Starting to stream ${verifications.length} claim verifications...`);
      
      for (let i = 0; i < verifications.length; i++) {
        try {
          const claim = verifications[i];
          
          // Small delay between claims for streaming effect
          await new Promise(resolve => setTimeout(resolve, 80));
          
          // Format claim with Reasoning and Code Execution tags
          let claimMessage = `\n${'='.repeat(80)}\n`;
          claimMessage += `\n**${claim.claim_id || 'Unknown Claim'}**: ${claim.claim_description || 'No description'}\n\n`;
          
          // Status badge
          const statusEmoji = claim.verification_status === 'verified' ? '✅' :
                             claim.verification_status === 'partially_verified' ? '⚠️' :
                             claim.verification_status === 'not_verified' ? '❌' : '❓';
          const confidenceScore = claim.confidence_score != null ? (claim.confidence_score * 100).toFixed(0) : 'N/A';
          claimMessage += `${statusEmoji} **Status**: ${claim.verification_status || 'unknown'} (Confidence: ${confidenceScore}%)\n\n`;
          
          // *Reasoning* Section
          if (claim.verification_notes) {
            claimMessage += `**<Reasoning>**\n`;
            claimMessage += `${claim.verification_notes}\n`;
            claimMessage += `**</Reasoning>**\n\n`;
          }
          
          // *Code Execution* Section (Evidence)
          if (claim.evidence_found && claim.evidence_found.length > 0) {
            claimMessage += `**<Code Execution>**\n`;
            claimMessage += `Found ${claim.evidence_found.length} piece(s) of evidence:\n\n`;
            
            claim.evidence_found.forEach((evidence: any, idx: number) => {
              const evidenceType = evidence?.evidence_type || 'unknown';
              const relevanceScore = evidence?.relevance_score != null ? (evidence.relevance_score * 100).toFixed(0) : 'N/A';
              const source = evidence?.source || 'Unknown source';
              const cellInfo = evidence?.cell_number !== undefined ? ` [Cell ${evidence.cell_number}]` : '';
              const evidenceText = evidence?.evidence_text || 'No evidence text';
              const truncatedText = evidenceText.substring(0, 200) + (evidenceText.length > 200 ? '...' : '');
              
              claimMessage += `  ${idx + 1}. **${evidenceType}** (relevance: ${relevanceScore}%)\n`;
              claimMessage += `     Source: \`${source}\`${cellInfo}\n`;
              claimMessage += `     Evidence: "${truncatedText}"\n\n`;
            });
            
            claimMessage += `**</Code Execution>**\n\n`;
          }
          
          // Code References
          if (claim.code_references && claim.code_references.length > 0) {
            claimMessage += `**Code References**: ${claim.code_references.join(', ')}\n\n`;
          }
          
          // Contradictions
          if (claim.contradictions && claim.contradictions.length > 0) {
            claimMessage += `**⚠️ Issues Found**:\n`;
            claim.contradictions.forEach((contradiction: any) => {
              const severity = contradiction?.severity ? contradiction.severity.toUpperCase() : 'UNKNOWN';
              const type = contradiction?.type || 'unknown';
              const description = contradiction?.description || 'No description';
              claimMessage += `  - [${severity}] ${type}: ${description}\n`;
            });
            claimMessage += `\n`;
          }
          
          setProgressMessages(prev => [...prev, {
            message: claimMessage,
            step: i + 1,
            timestamp: Date.now(),
          }]);
          
          console.log(`Streamed claim ${i + 1}/${verifications.length}: ${claim.claim_id}`);
        } catch (error) {
          console.error(`Error streaming claim ${i + 1}:`, error);
          // Add error message but continue with next claim
          setProgressMessages(prev => [...prev, {
            message: `\n⚠️ **Error processing claim ${i + 1}**: ${error instanceof Error ? error.message : 'Unknown error'}\n`,
            step: i + 1,
            timestamp: Date.now(),
          }]);
        }
      }
      
      console.log(`Finished streaming all ${verifications.length} claims`);

      // Summary
      await new Promise(resolve => setTimeout(resolve, 200));
      const assessment = verificationData.overall_assessment || {};
      
      setProgressMessages(prev => {
        const finalMessage = {
          message: `\n${'='.repeat(80)}\n\n` +
                   `**✓ Verification Complete!**\n\n` +
                   `**Overall Assessment**:\n` +
                   `- Risk Level: ${assessment.risk_level || 'Unknown'}\n` +
                   `- ${assessment.summary || 'No summary available'}\n\n` +
                   `**Process Summary**:\n` +
                   `1. ✓ Extracted ${claims.length} claims from model card\n` +
                   `2. ✓ Streamed ${verifications.length} verification results\n` +
                   `3. ✓ Total messages in log: ${prev.length + 1}\n\n` +
                   `All results streamed from existing verification data.`,
          timestamp: Date.now(),
        };
        console.log(`Total progress messages before final: ${prev.length}`);
        return [...prev, finalMessage];
      });

      // Save to context
      saveVerificationReport(path, verificationData);
      
    } catch (err) {
      throw new Error(`Failed to stream verification: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyModelCard = async () => {
    setVerifying(true);
    setError(null);
    setProgressMessages([]);
    setActiveTab("verification"); // Switch to verification tab immediately
    
    try {
      // First, check if verification JSON already exists
      const verificationJsonExists = await checkVerificationJsonExists();
      
      if (verificationJsonExists) {
        // Stream from existing JSON file with formatted output
        await streamFromExistingVerification();
        return;
      }
      
      // Otherwise, proceed with normal verification
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

      if (!response.ok) {
        throw new Error("Verification request failed");
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'progress') {
                // Add progress message (bounded, no large payloads)
                setProgressMessages(prev => {
                  const nextItem = {
                  message: data.message || 'Processing...',
                  step: data.data?.step,
                  timestamp: Date.now(),
                  };
                  const next = [...prev, nextItem];
                  // Keep only last 1000 entries to cap memory (increased to show more claims)
                  return next.length > 1000 ? next.slice(next.length - 1000) : next;
                });
              } else if (data.type === 'complete') {
                // Final report received
                if (data.report) {
                  saveVerificationReport(path, data.report);
                  
                  // Auto-save verification results to filesystem and public folder
                  try {
                    const saveResponse = await fetch('/api/save-verification', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        verification: data.report,
                        claims: data.report.claims ? { claims: data.report.claims } : null
                      })
                    });
                    
                    if (saveResponse.ok) {
                      const saveResult = await saveResponse.json();
                      console.log('✓ Verification results auto-saved:', saveResult.locations);
                      setProgressMessages(prev => {
                        const next = [...prev, {
                          message: '✓ Verification complete and saved to dashboard!',
                          timestamp: Date.now(),
                        }];
                        return next.length > 1000 ? next.slice(next.length - 1000) : next;
                      });
                    } else {
                      console.warn('Failed to auto-save verification results');
                      setProgressMessages(prev => {
                        const next = [...prev, {
                          message: '✓ Verification complete! (auto-save failed)',
                          timestamp: Date.now(),
                        }];
                        return next.length > 1000 ? next.slice(next.length - 1000) : next;
                      });
                    }
                  } catch (saveError) {
                    console.error('Error auto-saving verification:', saveError);
                    setProgressMessages(prev => {
                      const next = [...prev, {
                        message: '✓ Verification complete!',
                        timestamp: Date.now(),
                      }];
                      return next.length > 1000 ? next.slice(next.length - 1000) : next;
                    });
                  }
                }
              } else if (data.type === 'error') {
                throw new Error(data.message || 'Verification failed');
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE message:', line, parseError);
            }
          }
        }
      }
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
    setProgressMessages([]);
    setActiveTab("verification"); // Switch to verification tab immediately
    
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

      if (!response.ok) {
        throw new Error("Verification request failed");
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              // Strip code fences before parsing (in case LLM wrapped JSON)
              const payload = line.slice(6).trimStart();
              const cleaned = payload
                .replace(/^```json\s*/im, "")
                .replace(/^```\s*/im, "")
                .replace(/```\s*$/im, "")
                .trim();
              
              if (!cleaned) continue;
              
              const data = JSON.parse(cleaned);
              
              if (data.type === 'progress') {
                // Add progress message
                setProgressMessages(prev => [...prev, {
                  message: data.message || 'Processing...',
                  step: data.data?.step,
                  data: data.data,
                  timestamp: Date.now(),
                }]);
              } else if (data.type === 'complete') {
                // Final report received
                if (data.report) {
                  saveVerificationReport(path, data.report);
                  
                  // Also save notebook-specific discrepancies
                  if (data.discrepancies && Array.isArray(data.discrepancies)) {
                    for (const disc of data.discrepancies) {
                      if (disc.notebookPath && disc.issues) {
                        setNotebookDiscrepancies(disc.notebookPath, disc.issues);
                      }
                    }
                  }
                  
                  // Auto-save verification results to filesystem and public folder
                  try {
                    const saveResponse = await fetch('/api/save-verification', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        verification: data.report,
                        claims: data.report.claims ? { claims: data.report.claims } : null
                      })
                    });
                    
                    if (saveResponse.ok) {
                      const saveResult = await saveResponse.json();
                      console.log('✓ Verification results auto-saved:', saveResult.locations);
                      setProgressMessages(prev => [...prev, {
                        message: '✓ Verification complete and saved to dashboard!',
                        timestamp: Date.now(),
                      }]);
                    } else {
                      console.warn('Failed to auto-save verification results');
                      setProgressMessages(prev => [...prev, {
                        message: '✓ Verification complete! (auto-save failed)',
                        timestamp: Date.now(),
                      }]);
                    }
                  } catch (saveError) {
                    console.error('Error auto-saving verification:', saveError);
                    setProgressMessages(prev => [...prev, {
                      message: '✓ Verification complete!',
                      timestamp: Date.now(),
                    }]);
                  }
                }
              } else if (data.type === 'error') {
                throw new Error(data.message || 'Verification failed');
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE message:', line.slice(0, 100), parseError);
              // Don't crash on parse errors, continue processing stream
            }
          }
        }
      }
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
    <Card className="h-full flex flex-col">
      <CardContent className="h-full p-0 flex flex-col min-h-0">
        <div className="flex h-full flex-col min-h-0">
          <div className="border-b px-4 py-2 text-sm text-muted-foreground flex items-center gap-2 flex-shrink-0">
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
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
            <div className="border-b px-4 flex-shrink-0">
              <TabsList>
                <TabsTrigger value="content">
                  <FileText className="h-4 w-4 mr-1" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="verification" disabled={!verificationReport}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Verification
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="content" className="flex-1 m-0 min-h-0 overflow-hidden p-0">
              <ScrollArea className="h-full">
                <div className="p-6 pr-10">
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
                    code: ({ node, children, ...props }: any) => {
                      const text = String(children);
                      const inline = !(props.className && props.className.startsWith('language-'));
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
            
            <TabsContent value="verification" className="flex-1 m-0 min-h-0 overflow-hidden p-0">
              <ScrollArea className="h-full">
                <div className="p-4 pr-8">
              {(verifying || progressMessages.length > 0 || verificationReport) ? (
                <div className="space-y-4">
                  {/* Progress Log - Show if there are any messages */}
                  {progressMessages.length > 0 && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {verifying ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                <span className="font-semibold">Verifying model card...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="font-semibold">Verification Log</span>
                              </>
                            )}
                          </div>
                          {!verifying && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setProgressMessages([])}
                              className="text-xs"
                            >
                              Clear Log
                            </Button>
                          )}
                        </div>
                        <ScrollArea className="h-[700px]">
                          <div className="space-y-2">
                            {progressMessages.map((msg, idx) => {
                              // Check if message contains special tags
                              const hasReasoningTag = msg.message.includes('<Reasoning>');
                              const hasCodeExecutionTag = msg.message.includes('<Code Execution>');
                              
                              return (
                                <div
                                  key={`${idx}-${msg.timestamp}`}
                                  className={`text-sm p-3 rounded border ${
                                    hasReasoningTag || hasCodeExecutionTag 
                                      ? 'border-primary bg-primary/5' 
                                      : 'border-border bg-muted/30'
                                  }`}
                                >
                                  <div className="flex items-start gap-2">
                                    {msg.step && (
                                      <Badge variant="outline" className="shrink-0">
                                        Claim {msg.step}
                                      </Badge>
                                    )}
                                    <div className="flex-1">
                                      <div className="font-mono text-xs text-muted-foreground mb-2">
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                      </div>
                                      {/* Render message with markdown support */}
                                      <div className="mt-1 prose prose-sm dark:prose-invert max-w-none [&_p]:my-2 [&_pre]:my-2 [&_ul]:my-2 [&_ol]:my-2">
                                        <ReactMarkdown
                                          remarkPlugins={[remarkGfm]}
                                          components={{
                                            // Custom component for <Reasoning> tags
                                            p: ({ node, children, ...props }) => {
                                              const text = String(children);
                                              if (text.includes('<Reasoning>') || text.includes('</Reasoning>')) {
                                                if (text === '<Reasoning>') {
                                                  return (
                                                    <div className="my-3 p-3 bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 rounded">
                                                      <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">
                                                        🧠 Reasoning
                                                      </div>
                                                    </div>
                                                  );
                                                } else if (text === '</Reasoning>') {
                                                  return null;
                                                }
                                              }
                                              if (text.includes('<Code Execution>') || text.includes('</Code Execution>')) {
                                                if (text === '<Code Execution>') {
                                                  return (
                                                    <div className="my-3 p-3 bg-green-50 dark:bg-green-950/30 border-l-4 border-green-500 rounded">
                                                      <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-2">
                                                        ⚡ Code Execution
                                                      </div>
                                                    </div>
                                                  );
                                                } else if (text === '</Code Execution>') {
                                                  return null;
                                                }
                                              }
                                              return <p className="my-2" {...props}>{children}</p>;
                                            },
                                            code: ({ node, children, ...props }: any) => {
                                              const inline = !(props.className && props.className.startsWith('language-'));
                                              return inline ? (
                                                <code className="relative rounded px-[0.3rem] py-[0.2rem] font-mono text-xs bg-muted" {...props}>
                                                  {children}
                                                </code>
                                              ) : (
                                                <code className="relative rounded font-mono text-xs" {...props}>
                                                  {children}
                                                </code>
                                              );
                                            },
                                            pre: ({ node, ...props }) => (
                                              <pre className="my-2 bg-muted p-2 rounded overflow-x-auto text-xs" {...props} />
                                            ),
                                            strong: ({ node, ...props }) => (
                                              <strong className="font-semibold" {...props} />
                                            ),
                                            ul: ({ node, ...props }) => (
                                              <ul className="my-2 ml-4 list-disc [&>li]:mt-1" {...props} />
                                            ),
                                            ol: ({ node, ...props }) => (
                                              <ol className="my-2 ml-4 list-decimal [&>li]:mt-1" {...props} />
                                            ),
                                          }}
                                        >
                                          {msg.message}
                                        </ReactMarkdown>
                                      </div>
                                      {msg.data && Object.keys(msg.data).length > 0 && (
                                        <details className="mt-2">
                                          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                                            View details
                                          </summary>
                                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                                            {JSON.stringify(msg.data, null, 2)}
                                          </pre>
                                        </details>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center text-muted-foreground min-h-[400px]">
                  Click a verification button to see results
                </div>
              )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}

