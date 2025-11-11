import React from "react";

interface ModelCardViewerProps {
  content: string;
}

export function ModelCardViewer({ content }: ModelCardViewerProps) {
  return (
    <div style={{ height: "100%", overflow: "auto", padding: 16 }}>
      <div style={{ whiteSpace: "pre-wrap", fontFamily: "system-ui", lineHeight: 1.6 }}>
        {content.split("\n").map((line, idx) => {
          // Simple markdown-like rendering
          if (line.startsWith("# ")) {
            return <h1 key={idx} style={{ fontSize: 24, marginTop: 16, marginBottom: 8 }}>{line.slice(2)}</h1>;
          }
          if (line.startsWith("## ")) {
            return <h2 key={idx} style={{ fontSize: 20, marginTop: 12, marginBottom: 6 }}>{line.slice(3)}</h2>;
          }
          if (line.startsWith("### ")) {
            return <h3 key={idx} style={{ fontSize: 16, marginTop: 8, marginBottom: 4 }}>{line.slice(4)}</h3>;
          }
          if (line.trim() === "") {
            return <br key={idx} />;
          }
          return <p key={idx} style={{ margin: "4px 0" }}>{line}</p>;
        })}
      </div>
    </div>
  );
}

