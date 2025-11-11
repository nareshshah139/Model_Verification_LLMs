import React, { useEffect, useState } from "react";

export function StreamedAnalyzerPanel({ modelVersionId }: { modelVersionId: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const run = async () => {
      const resp = await fetch(`/api/analyze/${modelVersionId}`, { method: "POST" });
      if (!resp.body) return;
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setText((t) => t + decoder.decode(value));
      }
    };
    run();
  }, [modelVersionId]);

  return (
    <div style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", border: "1px solid #eee", padding: 8 }}>
      {text || "Analyzing..."}
    </div>
  );
}

