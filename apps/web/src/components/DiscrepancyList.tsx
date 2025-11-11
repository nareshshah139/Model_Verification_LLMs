import React from "react";

export type Discrepancy = {
  id?: string;
  category: string;
  severity: "low" | "med" | "high";
  description: string;
};

export function DiscrepancyList({ items }: { items: Discrepancy[] }) {
  if (!items?.length) return <div>No discrepancies.</div>;
  return (
    <div>
      {items.map((d, i) => (
        <div key={d.id ?? i} style={{ border: "1px solid #ddd", padding: 8, marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>
            {d.category} — <span>{d.severity.toUpperCase()}</span>
          </div>
          <div>{d.description}</div>
        </div>
      ))}
    </div>
  );
}

