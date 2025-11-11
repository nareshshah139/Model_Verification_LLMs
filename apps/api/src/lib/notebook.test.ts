import { describe, it, expect } from "vitest";
import { extractPythonFromNotebook, notebookCodeToPythonScript } from "./notebook";

describe("notebook extraction", () => {
  const sampleNotebook = {
    cells: [
      { cell_type: "code", source: ["import pandas as pd\n", "df = pd.read_csv('data.csv')"] },
      { cell_type: "markdown", source: ["# Analysis"] },
      { cell_type: "code", source: ["print(df.head())"] },
    ],
  };

  it("extracts Python code cells", () => {
    const cells = extractPythonFromNotebook(sampleNotebook);
    expect(cells).toHaveLength(2);
    expect(cells[0]).toContain("import pandas");
    expect(cells[1]).toContain("print(df.head())");
  });

  it("converts notebook to Python script for analysis", () => {
    const script = notebookCodeToPythonScript(sampleNotebook, "test.ipynb");
    expect(script).toContain("# Extracted from test.ipynb");
    expect(script).toContain("import pandas");
    expect(script).toContain("print(df.head())");
  });
});

