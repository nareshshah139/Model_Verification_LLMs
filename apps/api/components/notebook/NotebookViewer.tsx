"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";
import { Button } from "@/components/ui/button";

// Register Python language for highlight.js
hljs.registerLanguage("python", python);

export interface NotebookCell {
  cell_type: "code" | "markdown" | "raw";
  source: string | string[];
  outputs?: any[];
  execution_count?: number | null;
  metadata?: Record<string, any>;
}

export interface Notebook {
  cells: NotebookCell[];
  metadata?: Record<string, any>;
  nbformat?: number;
  nbformat_minor?: number;
}

interface NotebookViewerProps {
  notebook: Notebook;
  path: string;
  discrepancies?: Array<{
    type: string;
    line?: number;
    message: string;
    severity: "error" | "warning";
    codeSnippet?: string;
  }>;
}

function CodeCell({ source, executionCount, outputs, issues }: { 
  source: string; 
  executionCount?: number | null;
  outputs?: any[];
  issues?: Array<{
    type: string;
    line?: number;
    message: string;
    severity: "error" | "warning";
    codeSnippet?: string;
  }>;
}) {
  const codeRef = useRef<HTMLElement>(null);
  const hasErrors = issues && issues.some(i => i.severity === "error");
  const hasWarnings = issues && issues.some(i => i.severity === "warning");

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [source]);

  return (
    <div className={`notebook-cell code-cell border-2 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
      hasErrors ? "border-red-500 bg-red-50/20 dark:bg-red-950/20" : 
      hasWarnings ? "border-yellow-500 bg-yellow-50/20 dark:bg-yellow-950/20" : 
      "border-gray-200 dark:border-gray-700"
    }`}>
      {/* Input */}
      <div className="flex items-start">
        <div className="flex-shrink-0 w-16 py-2 px-3 bg-emerald-50 dark:bg-emerald-950 text-xs font-mono text-emerald-700 dark:text-emerald-400 text-right border-r-2 border-emerald-200 dark:border-emerald-800">
          In [{executionCount ?? " "}]
        </div>
        <div className="flex-1 overflow-auto">
          <pre className="m-0 p-3 overflow-auto bg-gray-50 dark:bg-gray-900">
            <code ref={codeRef} className="language-python">{source}</code>
          </pre>
        </div>
      </div>

      {/* Output */}
      {outputs && outputs.length > 0 && (
        <div className="flex items-start border-t-2 border-blue-200 dark:border-blue-900">
          <div className="flex-shrink-0 w-16 py-2 px-3 bg-blue-50 dark:bg-blue-950 text-xs font-mono text-blue-700 dark:text-blue-300 text-right border-r border-blue-200 dark:border-blue-800">
            Out[{executionCount ?? " "}]
          </div>
          <div className="flex-1 p-3 bg-blue-50/30 dark:bg-blue-950/30 overflow-auto">
            <div className="space-y-2">
              {outputs.map((output, oidx) => (
                <NotebookOutput key={oidx} output={output} />
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Verification Issues */}
      {issues && issues.length > 0 && (
        <div className={`border-t-2 p-3 ${
          hasErrors ? "bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800" :
          "bg-yellow-50 dark:bg-yellow-950/50 border-yellow-300 dark:border-yellow-800"
        }`}>
          <div className="space-y-2">
            {issues.map((issue, idx) => (
              <div key={idx} className={`text-sm flex items-start gap-2 ${
                issue.severity === "error" ? "text-red-700 dark:text-red-300" : "text-yellow-700 dark:text-yellow-300"
              }`}>
                <span className="font-semibold">{issue.severity === "error" ? "❌" : "⚠️"}</span>
                <div>
                  <div className="font-semibold capitalize">{issue.type}</div>
                  <div className="text-xs mt-1">{issue.message}</div>
                  {issue.codeSnippet && (
                    <pre className="mt-1 text-xs bg-white/50 dark:bg-black/30 p-2 rounded overflow-x-auto">
                      {issue.codeSnippet}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotebookOutput({ output }: { output: any }) {
  // Handle different output types
  if (output.output_type === "stream") {
    const text = Array.isArray(output.text) ? output.text.join("") : output.text;
    return (
      <pre className="m-0 p-3 text-sm whitespace-pre-wrap font-mono bg-slate-900 text-green-400 rounded border border-slate-700 shadow-sm">
        {text}
      </pre>
    );
  }

  if (output.output_type === "error") {
    const traceback = Array.isArray(output.traceback)
      ? output.traceback.join("\n")
      : output.traceback;
    return (
      <pre className="m-0 p-3 text-sm whitespace-pre-wrap font-mono bg-red-950 text-red-200 rounded border border-red-800 shadow-sm">
        {traceback}
      </pre>
    );
  }

  if (output.output_type === "execute_result" || output.output_type === "display_data") {
    const data = output.data;
    
    // Handle images
    if (data["image/png"]) {
      return (
        <div className="bg-white dark:bg-slate-800 p-2 rounded border border-gray-300 dark:border-gray-600">
          <img src={`data:image/png;base64,${data["image/png"]}`} alt="Output" className="max-w-full" />
        </div>
      );
    }
    if (data["image/jpeg"]) {
      return (
        <div className="bg-white dark:bg-slate-800 p-2 rounded border border-gray-300 dark:border-gray-600">
          <img src={`data:image/jpeg;base64,${data["image/jpeg"]}`} alt="Output" className="max-w-full" />
        </div>
      );
    }
    if (data["image/svg+xml"]) {
      const svg = Array.isArray(data["image/svg+xml"]) 
        ? data["image/svg+xml"].join("") 
        : data["image/svg+xml"];
      return (
        <div className="bg-white dark:bg-slate-800 p-2 rounded border border-gray-300 dark:border-gray-600">
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      );
    }

    // Handle HTML
    if (data["text/html"]) {
      const html = Array.isArray(data["text/html"]) 
        ? data["text/html"].join("") 
        : data["text/html"];
      return (
        <div 
          className="notebook-html-output overflow-auto max-w-full bg-white dark:bg-slate-800 p-3 rounded border border-gray-300 dark:border-gray-600"
          dangerouslySetInnerHTML={{ __html: html }} 
        />
      );
    }

    // Handle plain text
    if (data["text/plain"]) {
      const text = Array.isArray(data["text/plain"]) 
        ? data["text/plain"].join("") 
        : data["text/plain"];
      return (
        <pre className="m-0 p-3 text-sm whitespace-pre-wrap font-mono bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded border border-gray-300 dark:border-gray-600 shadow-sm">
          {text}
        </pre>
      );
    }

    // Fallback to JSON
    return (
      <pre className="m-0 p-3 text-sm whitespace-pre-wrap font-mono bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded border border-gray-300 dark:border-gray-600 shadow-sm">
        {JSON.stringify(output, null, 2)}
      </pre>
    );
  }

  return null;
}

export function NotebookViewer({ notebook, path, discrepancies }: NotebookViewerProps) {
  const [showExecutable, setShowExecutable] = useState(false);

  if (!notebook.cells || !Array.isArray(notebook.cells)) {
    return <div className="p-4">Invalid notebook format</div>;
  }

  if (showExecutable) {
    return <ExecutableNotebookViewer notebook={notebook} path={path} onClose={() => setShowExecutable(false)} />;
  }

  // Count total issues
  const totalIssues = discrepancies?.length || 0;
  const criticalIssues = discrepancies?.filter(d => d.severity === "error").length || 0;

  return (
    <div className="w-full h-full overflow-auto bg-white dark:bg-gray-950">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header with file info and executable option */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Notebook</h3>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{path}</h2>
            {totalIssues > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  criticalIssues > 0 ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                }`}>
                  {totalIssues} issue{totalIssues !== 1 ? "s" : ""} found
                </span>
                {criticalIssues > 0 && (
                  <span className="text-xs text-red-600 dark:text-red-400">
                    ({criticalIssues} critical)
                  </span>
                )}
              </div>
            )}
          </div>
          <Button
            onClick={() => setShowExecutable(true)}
            className="px-4 py-2 text-sm font-medium"
            title="Open in executable environment with Python kernel"
          >
            🚀 Open Executable
          </Button>
        </div>

        {/* Notebook cells */}
        <div className="space-y-4">
          {notebook.cells.map((cell, idx) => {
            const source = Array.isArray(cell.source) ? cell.source.join("") : cell.source;

            if (cell.cell_type === "markdown") {
              return (
                <div key={idx} className="notebook-cell markdown-cell prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                  >
                    {source}
                  </ReactMarkdown>
                </div>
              );
            }

            if (cell.cell_type === "code") {
              // Find issues for this cell (simple matching by checking if source contains the code snippet)
              const cellIssues = discrepancies?.filter(d => 
                d.codeSnippet && source.includes(d.codeSnippet)
              ) || [];
              
              return (
                <CodeCell 
                  key={idx} 
                  source={source} 
                  executionCount={cell.execution_count}
                  outputs={cell.outputs}
                  issues={cellIssues.length > 0 ? cellIssues : undefined}
                />
              );
            }

            if (cell.cell_type === "raw") {
              return (
                <div key={idx} className="notebook-cell raw-cell p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded">
                  <pre className="m-0 text-xs whitespace-pre-wrap font-mono text-gray-600 dark:text-gray-400">
                    {source}
                  </pre>
                </div>
              );
            }

            return null;
          })}
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
          <p>
            Notebook format: {notebook.nbformat}.{notebook.nbformat_minor} | {notebook.cells.length} cells
          </p>
        </div>
      </div>
    </div>
  );
}

// Executable notebook viewer using JupyterLite
function ExecutableNotebookViewer({ notebook, path, onClose }: { notebook: Notebook; path: string; onClose: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle messages from JupyterLite iframe
      if (event.data.type === "jupyterlite-ready") {
        setIsLoaded(true);
        // Optionally send notebook content to iframe
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: "load-notebook",
            notebook: notebook
          }, "*");
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [notebook]);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-950">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Executable Notebook: {path}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Powered by JupyterLite (Python kernel running in browser via WebAssembly)
          </p>
        </div>
        <Button
          onClick={onClose}
          variant="outline"
        >
          ← Back to Static View
        </Button>
      </div>
      
      <div className="flex-1 relative">
        <iframe
          ref={iframeRef}
          src={`https://jupyterlite.github.io/demo/repl/index.html?kernel=python&toolbar=1`}
          className="w-full h-full border-0"
          title="JupyterLite Executable Notebook"
          allow="cross-origin-isolated"
        />
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-950/80">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading JupyterLite environment...</p>
            </div>
          </div>
        )}
        <div className="absolute bottom-4 right-4 max-w-md p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg shadow-lg text-xs">
          <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            📝 Note: Full Integration Coming Soon
          </p>
          <p className="text-blue-800 dark:text-blue-200">
            Currently showing JupyterLite demo. To load your notebook, you can:
          </p>
          <ul className="mt-2 space-y-1 text-blue-700 dark:text-blue-300 list-disc list-inside">
            <li>Copy/paste cells manually</li>
            <li>Use File → Upload in JupyterLite</li>
          </ul>
          <p className="mt-2 text-blue-700 dark:text-blue-300">
            For now, use the static view for reading your notebook.
          </p>
        </div>
      </div>
    </div>
  );
}

