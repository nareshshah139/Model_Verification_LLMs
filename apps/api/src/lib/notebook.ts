/**
 * Extract Python code cells from a Jupyter notebook (.ipynb) file.
 * Returns an array of code cell contents for analysis purposes.
 * The notebook structure itself is preserved separately.
 */
export function extractPythonFromNotebook(notebookJson: any): string[] {
  if (!notebookJson.cells || !Array.isArray(notebookJson.cells)) {
    return [];
  }
  const codeCells: string[] = [];
  for (const cell of notebookJson.cells) {
    if (cell.cell_type === "code" && Array.isArray(cell.source)) {
      const code = cell.source.join("");
      if (code.trim()) {
        codeCells.push(code);
      }
    }
  }
  return codeCells;
}

/**
 * Convert notebook code cells to a Python script for tree-sitter analysis.
 * This is only used for code analysis - the original notebook structure is preserved.
 */
export function notebookCodeToPythonScript(notebookJson: any, notebookPath: string): string {
  const cells = extractPythonFromNotebook(notebookJson);
  const header = `# Extracted from ${notebookPath}\n# Jupyter notebook code cells\n\n`;
  return header + cells.join("\n\n# --- Next Cell ---\n\n");
}

