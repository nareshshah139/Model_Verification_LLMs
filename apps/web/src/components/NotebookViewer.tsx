import React from "react";

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
}

export function NotebookViewer({ notebook, path }: NotebookViewerProps) {
  if (!notebook.cells || !Array.isArray(notebook.cells)) {
    return <div>Invalid notebook format</div>;
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 4, padding: 16, marginBottom: 16 }}>
      <h4 style={{ marginTop: 0, color: "#666" }}>{path}</h4>
      {notebook.cells.map((cell, idx) => {
        const source = Array.isArray(cell.source) ? cell.source.join("") : cell.source;
        
        if (cell.cell_type === "markdown") {
          return (
            <div key={idx} style={{ marginBottom: 16, padding: 12, background: "#f5f5f5", borderRadius: 4 }}>
              <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>Markdown</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{source}</div>
            </div>
          );
        }
        
        if (cell.cell_type === "code") {
          return (
            <div key={idx} style={{ marginBottom: 16, border: "1px solid #e0e0e0", borderRadius: 4 }}>
              <div style={{ padding: 8, background: "#f9f9f9", borderBottom: "1px solid #e0e0e0", fontSize: 12, color: "#666" }}>
                Code {cell.execution_count !== null && cell.execution_count !== undefined ? `[${cell.execution_count}]` : ""}
              </div>
              <pre style={{ margin: 0, padding: 12, overflow: "auto", background: "#fff" }}>
                <code>{source}</code>
              </pre>
              {cell.outputs && cell.outputs.length > 0 && (
                <div style={{ padding: 12, background: "#fafafa", borderTop: "1px solid #e0e0e0" }}>
                  <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>Output:</div>
                  {cell.outputs.map((output, oidx) => (
                    <pre key={oidx} style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>
                      {typeof output === "object" && output.text ? output.text.join("") : JSON.stringify(output, null, 2)}
                    </pre>
                  ))}
                </div>
              )}
            </div>
          );
        }
        
        return null;
      })}
    </div>
  );
}

