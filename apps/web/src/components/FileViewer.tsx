import React from "react";
import { NotebookViewer } from "./NotebookViewer";

interface FileViewerProps {
  content: string;
  lang?: string;
  isNotebook?: boolean;
  notebookJson?: any;
  path: string;
}

export function FileViewer({ content, lang, isNotebook, notebookJson, path }: FileViewerProps) {
  if (isNotebook && notebookJson) {
    return <NotebookViewer notebook={notebookJson} path={path} />;
  }
  
  return (
    <div style={{ height: "100%", overflow: "auto", padding: 16 }}>
      <div style={{ marginBottom: 8, fontSize: 12, color: "#666" }}>{path}</div>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 14 }}>
        <code>{content}</code>
      </pre>
    </div>
  );
}

