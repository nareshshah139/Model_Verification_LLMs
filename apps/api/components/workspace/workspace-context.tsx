"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { CenterTab, Openable, ModelCard } from "@/src/lib/types";
import { nanoid } from "nanoid";

type VerificationReport = {
  consistency_score?: number;
  claims_spec?: any;
  evidence_table?: Record<string, any[]>;
  metrics_diffs?: Record<string, any>;
};

type NotebookDiscrepancy = {
  type: string;
  line?: number;
  message: string;
  severity: "error" | "warning";
  codeSnippet?: string;
};

type Ctx = {
  tabs: CenterTab[];
  activeId: string | null;
  openItem: (item: Openable) => void; // python/ipynb go to center
  closeTab: (id: string) => void;
  setActive: (id: string) => void;
  selectedModelCard: ModelCard | null;
  selectModelCard: (card: ModelCard) => void;
  // Verification state management
  verificationReports: Map<string, VerificationReport>;
  setVerificationReport: (modelCardPath: string, report: VerificationReport) => void;
  getVerificationReport: (modelCardPath: string) => VerificationReport | undefined;
  notebookDiscrepancies: Map<string, NotebookDiscrepancy[]>;
  setNotebookDiscrepancies: (notebookPath: string, discrepancies: NotebookDiscrepancy[]) => void;
  getNotebookDiscrepancies: (notebookPath: string) => NotebookDiscrepancy[] | undefined;
};

const WorkspaceCtx = createContext<Ctx | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<CenterTab[]>([
    {
      id: nanoid(),
      title: "Welcome.ipynb",
      kind: "notebook",
      payload: { path: "/notebooks/Welcome.ipynb" },
    },
  ]);
  const [activeId, setActiveId] = useState<string | null>(tabs[0]?.id ?? null);
  const [selectedModelCard, setSelectedModelCard] = useState<ModelCard | null>({
    path: "/model-cards/example_model_card.md",
    type: "markdown",
  });
  
  // Persistent verification state - survives component unmount/remount
  const [verificationReports, setVerificationReports] = useState<Map<string, VerificationReport>>(() => {
    // Load from localStorage on initial mount
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("verificationReports");
        if (saved) {
          const parsed = JSON.parse(saved);
          return new Map(Object.entries(parsed));
        }
      } catch (error) {
        console.error("Failed to load verification reports from localStorage:", error);
      }
    }
    return new Map();
  });
  
  const [notebookDiscrepancies, setNotebookDiscrepanciesState] = useState<Map<string, NotebookDiscrepancy[]>>(() => {
    // Load from localStorage on initial mount
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("notebookDiscrepancies");
        if (saved) {
          const parsed = JSON.parse(saved);
          return new Map(Object.entries(parsed));
        }
      } catch (error) {
        console.error("Failed to load notebook discrepancies from localStorage:", error);
      }
    }
    return new Map();
  });

  const openItem = useCallback((item: Openable) => {
    const id = nanoid();
    
    let newTab: CenterTab;
    if (item.kind === "python") {
      newTab = {
        id,
        title: item.payload.path.split("/").pop() || "script.py",
        kind: "python",
        payload: item.payload,
      };
    } else {
      newTab = {
        id,
        title: item.payload.path.split("/").pop() || "Notebook.ipynb",
        kind: "notebook",
        payload: item.payload,
      };
    }

    setTabs((t) => [...t, newTab]);
    setActiveId(id);
  }, []);

  const selectModelCard = useCallback((card: ModelCard) => {
    setSelectedModelCard(card);
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((t) => {
      const remaining = t.filter((x) => x.id !== id);
      setActiveId((prev) => {
        if (prev !== id) return prev;
        // if closing active, pick last tab if exists
        return remaining.length ? remaining[remaining.length - 1].id : null;
      });
      return remaining;
    });
  }, []);

  const setActive = useCallback((id: string) => setActiveId(id), []);

  // Verification report management
  const setVerificationReport = useCallback((modelCardPath: string, report: VerificationReport) => {
    setVerificationReports((prev) => {
      const next = new Map(prev);
      next.set(modelCardPath, report);
      
      // Save to localStorage
      if (typeof window !== "undefined") {
        try {
          const obj = Object.fromEntries(next);
          localStorage.setItem("verificationReports", JSON.stringify(obj));
        } catch (error) {
          console.error("Failed to save verification reports to localStorage:", error);
        }
      }
      
      return next;
    });
  }, []);

  const getVerificationReport = useCallback((modelCardPath: string) => {
    return verificationReports.get(modelCardPath);
  }, [verificationReports]);

  // Notebook discrepancies management
  const setNotebookDiscrepancies = useCallback((notebookPath: string, discrepancies: NotebookDiscrepancy[]) => {
    setNotebookDiscrepanciesState((prev) => {
      const next = new Map(prev);
      next.set(notebookPath, discrepancies);
      
      // Save to localStorage
      if (typeof window !== "undefined") {
        try {
          const obj = Object.fromEntries(next);
          localStorage.setItem("notebookDiscrepancies", JSON.stringify(obj));
        } catch (error) {
          console.error("Failed to save notebook discrepancies to localStorage:", error);
        }
      }
      
      return next;
    });
  }, []);

  const getNotebookDiscrepancies = useCallback((notebookPath: string) => {
    return notebookDiscrepancies.get(notebookPath);
  }, [notebookDiscrepancies]);

  const value = useMemo<Ctx>(
    () => ({ 
      tabs, 
      activeId, 
      openItem, 
      closeTab, 
      setActive, 
      selectedModelCard, 
      selectModelCard,
      verificationReports,
      setVerificationReport,
      getVerificationReport,
      notebookDiscrepancies,
      setNotebookDiscrepancies,
      getNotebookDiscrepancies,
    }),
    [
      tabs, 
      activeId, 
      openItem, 
      closeTab, 
      setActive, 
      selectedModelCard, 
      selectModelCard,
      verificationReports,
      setVerificationReport,
      getVerificationReport,
      notebookDiscrepancies,
      setNotebookDiscrepancies,
      getNotebookDiscrepancies,
    ]
  );

  return <WorkspaceCtx.Provider value={value}>{children}</WorkspaceCtx.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceCtx);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

