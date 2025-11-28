import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

/**
 * Drift seed definitions with materiality tiers
 */
const DRIFT_SEEDS = [
  {
    id: 1,
    name: "Label coding",
    materialityTier: "T1" as const,
    modelCard: "default = 1, non-default = 0",
    repoCode: "Target is default = 0, non-default = 1",
    rationale: "Inverts target semantics; changes PD and approvals",
    keywords: ["target", "label", "default", "non-default", "encoding"],
  },
  {
    id: 2,
    name: "LGD definition/algorithm",
    materialityTier: "T1" as const,
    modelCard: "LGD = 1 - (recoveries / UPB); beta regression",
    repoCode: "Recovery Rate = Recoveries / Funded Amount; two-stage (logistic + linear)",
    rationale: "Changes LGD scale and EL materiality",
    keywords: ["lgd", "loss given default", "recovery", "upb", "funded"],
  },
  {
    id: 3,
    name: "EAD definition/algorithm",
    materialityTier: "T1" as const,
    modelCard: "EAD = UPB + AI (Accrued Interest); CCF via regression",
    repoCode: "CCF on funded amount; linear regression; MAE reported",
    rationale: "Material EL change; impacts pricing and capital",
    keywords: ["ead", "exposure at default", "ccf", "credit conversion", "funded"],
  },
  {
    id: 4,
    name: "Score scale, bands, ROI floor",
    materialityTier: "T1" as const,
    modelCard: "300-900 scale with A-G classes and 3.00% ROI floor",
    repoCode: "300-850 scale with AA-F classes and 2.15% ROI floor",
    rationale: "Direct policy effects on approvals/declines & ROI gate",
    keywords: ["score", "scale", "bands", "roi", "threshold", "cutoff"],
  },
  {
    id: 5,
    name: "PD Horizon",
    materialityTier: "T1" as const,
    modelCard: "12 months",
    repoCode: "9 months",
    rationale: "Different label horizons affect rates and cutoffs",
    keywords: ["pd", "horizon", "months", "time window", "probability of default"],
  },
  {
    id: 6,
    name: "Population filter",
    materialityTier: "T1" as const,
    modelCard: "Different applicant selection rules",
    repoCode: "Different applicant selection rules",
    rationale: "Changes applicant risk and fairness risk",
    keywords: ["population", "filter", "applicant", "selection", "eligibility"],
  },
  {
    id: 7,
    name: "Validation split logic",
    materialityTier: "T2" as const,
    modelCard: "Random stratified 70/15/15 (+ 2015 OOT monitor)",
    repoCode: "out-of-time splits and 2015 monitoring",
    rationale: "Alters performance / stability estimates but not policy",
    keywords: ["validation", "split", "train", "test", "stratified", "oot"],
  },
  {
    id: 8,
    name: "PD preprocessing",
    materialityTier: "T2" as const,
    modelCard: "WOE/monotonic binning + min-max scaling",
    repoCode: "one-hot encoding, ordinal encoding, and standard scaling",
    rationale: "Same objective; moves metrics and explainability",
    keywords: ["preprocessing", "encoding", "woe", "binning", "scaling", "one-hot"],
  },
  {
    id: 9,
    name: "Class weight / C (regularization)",
    materialityTier: "T2" as const,
    modelCard: "Different hyperparameter choices",
    repoCode: "Different hyperparameter choices",
    rationale: "Boundary and calibration shift; same objective",
    keywords: ["class_weight", "regularization", "hyperparameter", "c parameter"],
  },
  {
    id: 10,
    name: "Imputation policy",
    materialityTier: "T2" as const,
    modelCard: "Specified approach",
    repoCode: "median imputation",
    rationale: "Changes signal capture for missing values",
    keywords: ["imputation", "missing", "fillna", "median", "mean"],
  },
  {
    id: 11,
    name: "Monitoring thresholds phrasing",
    materialityTier: "T3" as const,
    modelCard: "Different phrasing",
    repoCode: "Different phrasing",
    rationale: "Interpretive alignment; negligible by itself",
    keywords: ["monitoring", "threshold", "phrasing"],
  },
  {
    id: 12,
    name: "Variable naming",
    materialityTier: "T3" as const,
    modelCard: "Different naming",
    repoCode: "Different naming",
    rationale: "Cosmetic only",
    keywords: ["variable", "naming", "column", "rename"],
  },
  {
    id: 13,
    name: "Rounding plots",
    materialityTier: "T3" as const,
    modelCard: "Different rounding",
    repoCode: "Different rounding",
    rationale: "Cosmetic only",
    keywords: ["rounding", "decimal", "precision", "plot"],
  },
  {
    id: 14,
    name: "Python version",
    materialityTier: "T3" as const,
    modelCard: "Different version",
    repoCode: "Different version",
    rationale: "Operational; usually negligible if dependencies are pinned",
    keywords: ["python", "version", "3.8", "3.9", "3.10"],
  },
];

/**
 * Extract code content from notebook
 */
function extractNotebookCode(notebook: any): string {
  if (!notebook || !notebook.cells) {
    return "";
  }

  return notebook.cells
    .filter((cell: any) => cell.cell_type === "code")
    .map((cell: any) => {
      if (Array.isArray(cell.source)) {
        return cell.source.join("");
      }
      return cell.source || "";
    })
    .join("\n\n");
}

/**
 * Detect drifts by analyzing code content
 */
function detectDrifts(baselineCode: string, modifiedCode: string): any[] {
  const detectedDrifts: any[] = [];
  const baselineLower = baselineCode.toLowerCase();
  const modifiedLower = modifiedCode.toLowerCase();

  for (const seed of DRIFT_SEEDS) {
    const evidence: string[] = [];
    let detected = false;

    // Check if keywords appear in the code
    for (const keyword of seed.keywords) {
      const keywordLower = keyword.toLowerCase();
      const inBaseline = baselineLower.includes(keywordLower);
      const inModified = modifiedLower.includes(keywordLower);

      if (inBaseline || inModified) {
        // Extract a snippet showing the keyword in context
        const codeToSearch = inModified ? modifiedCode : baselineCode;
        const lowerToSearch = inModified ? modifiedLower : baselineLower;
        const idx = lowerToSearch.indexOf(keywordLower);
        
        if (idx !== -1) {
          const start = Math.max(0, idx - 30);
          const end = Math.min(codeToSearch.length, idx + keywordLower.length + 30);
          const snippet = codeToSearch.substring(start, end).trim();
          evidence.push(snippet);
        }

        // If keyword behavior differs between baseline and modified, mark as detected
        if (inBaseline !== inModified) {
          detected = true;
        }
      }
    }

    // Additional heuristic: check for specific patterns
    if (seed.id === 1) {
      // Label coding
      const baselineHasTarget = baselineLower.includes("target") || baselineLower.includes("default");
      const modifiedHasTarget = modifiedLower.includes("target") || modifiedLower.includes("default");
      if (baselineHasTarget !== modifiedHasTarget) {
        detected = true;
      }
    } else if (seed.id === 8) {
      // Preprocessing differences
      const baselineHasWOE = baselineLower.includes("woe") || baselineLower.includes("weight of evidence");
      const modifiedHasOneHot = modifiedLower.includes("one-hot") || modifiedLower.includes("get_dummies");
      if (baselineHasWOE !== modifiedHasOneHot) {
        detected = true;
      }
    }

    detectedDrifts.push({
      ...seed,
      detected,
      evidence: evidence.slice(0, 3), // Limit to top 3 evidence snippets
      severity: seed.materialityTier === "T1" ? "high" : seed.materialityTier === "T2" ? "medium" : "low",
    });
  }

  return detectedDrifts;
}

/**
 * Calculate code comparison metrics
 */
function compareCode(baselineCode: string, modifiedCode: string): any {
  const baselineLines = baselineCode.split("\n");
  const modifiedLines = modifiedCode.split("\n");

  // Simple diff: count added/removed lines
  const baselineSet = new Set(baselineLines.filter(l => l.trim()));
  const modifiedSet = new Set(modifiedLines.filter(l => l.trim()));

  let addedLines = 0;
  let removedLines = 0;

  for (const line of modifiedSet) {
    if (!baselineSet.has(line)) {
      addedLines++;
    }
  }

  for (const line of baselineSet) {
    if (!modifiedSet.has(line)) {
      removedLines++;
    }
  }

  return {
    addedLines,
    removedLines,
    modifiedCells: Math.min(addedLines, removedLines), // Approximation
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baselinePath, modifiedNotebook, repoPath } = body;

    if (!baselinePath || !modifiedNotebook) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Read baseline notebook
    const fullBaselinePath = path.join(repoPath, baselinePath);
    const baselineContent = await fs.readFile(fullBaselinePath, "utf-8");
    const baselineNotebook = JSON.parse(baselineContent);

    // Extract code from both notebooks
    const baselineCode = extractNotebookCode(baselineNotebook);
    const modifiedCode = extractNotebookCode(modifiedNotebook);

    // Detect drifts
    const drifts = detectDrifts(baselineCode, modifiedCode);

    // Count by tier
    const summary = {
      t1Count: drifts.filter(d => d.materialityTier === "T1" && d.detected).length,
      t2Count: drifts.filter(d => d.materialityTier === "T2" && d.detected).length,
      t3Count: drifts.filter(d => d.materialityTier === "T3" && d.detected).length,
    };

    // Get unique categories
    const affectedCategories = [
      ...new Set(drifts.filter(d => d.detected).map(d => d.name)),
    ];

    // Calculate code comparison
    const codeComparison = compareCode(baselineCode, modifiedCode);

    const results = {
      totalChanges: summary.t1Count + summary.t2Count + summary.t3Count,
      affectedCategories,
      drifts,
      summary,
      codeComparison,
    };

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Drift analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze drift" },
      { status: 500 }
    );
  }
}

