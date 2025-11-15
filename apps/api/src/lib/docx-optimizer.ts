/**
 * Utility functions to optimize DOCX-extracted text for token efficiency.
 * Reduces token count while preserving important information.
 */

/**
 * Optimize extracted DOCX text to reduce token count.
 * 
 * This function performs several optimizations:
 * 1. Removes excessive whitespace and normalizes line breaks
 * 2. Removes page numbers and repetitive headers/footers
 * 3. Removes redundant blank lines
 * 4. Removes common DOCX artifacts
 * 5. Normalizes spacing around punctuation
 * 6. Removes table formatting artifacts
 * 
 * @param text Raw text extracted from DOCX
 * @returns Optimized text with reduced token count
 */
export function optimizeDocxText(text: string): string {
  let optimized = text;

  // 1. Remove page numbers (common patterns: "Page 1", "1", "Page 1 of 10", etc.)
  optimized = optimized.replace(/\bPage\s+\d+\s+(?:of\s+\d+)?\b/gi, '');
  optimized = optimized.replace(/^\s*\d+\s*$/gm, ''); // Standalone page numbers on their own line
  
  // 2. Remove common header/footer patterns (repetitive text at start/end of lines)
  // Look for lines that repeat multiple times (likely headers/footers)
  const lines = optimized.split('\n');
  const lineCounts = new Map<string, number>();
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.length > 0 && trimmed.length < 100) { // Only count short lines
      lineCounts.set(trimmed, (lineCounts.get(trimmed) || 0) + 1);
    }
  });
  
  // Remove lines that appear more than 3 times (likely headers/footers)
  const repetitiveLines = Array.from(lineCounts.entries())
    .filter(([_, count]) => count > 3)
    .map(([line, _]) => line);
  
  if (repetitiveLines.length > 0) {
    optimized = lines
      .filter(line => !repetitiveLines.includes(line.trim()))
      .join('\n');
  }

  // 3. Remove excessive whitespace and normalize line breaks
  optimized = optimized
    // Remove multiple spaces (keep single space)
    .replace(/[ \t]+/g, ' ')
    // Remove multiple newlines (keep max 2 for paragraph breaks)
    .replace(/\n{3,}/g, '\n\n')
    // Remove trailing whitespace from lines
    .replace(/[ \t]+$/gm, '')
    // Remove leading whitespace from lines (but preserve indentation for lists)
    .replace(/^[ \t]+$/gm, '');

  // 4. Remove common DOCX artifacts
  optimized = optimized
    // Remove form field markers
    .replace(/\u00A0/g, ' ') // Non-breaking spaces to regular spaces
    .replace(/[\u2000-\u200B\u2028-\u2029\uFEFF]/g, '') // Various Unicode whitespace
    // Remove XML-like tags that might have leaked through
    .replace(/<[^>]+>/g, '')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // 5. Normalize spacing around punctuation
  optimized = optimized
    // Remove spaces before punctuation
    .replace(/\s+([.,;:!?])/g, '$1')
    // Normalize spacing after punctuation (single space)
    .replace(/([.,;:!?])\s+/g, '$1 ')
    // Normalize spacing around parentheses
    .replace(/\s*\(\s*/g, ' (')
    .replace(/\s*\)\s*/g, ') ')
    // Normalize spacing around quotes
    .replace(/\s*["']\s*/g, '"')
    .replace(/\s*["']\s*/g, '"');

  // 6. Remove table formatting artifacts (excessive separators)
  optimized = optimized
    // Remove lines that are just separators (dashes, underscores, equals)
    .replace(/^[-=_]{3,}$/gm, '')
    // Remove excessive table-like formatting
    .replace(/\|{3,}/g, '|')
    // Clean up table-like structures
    .replace(/\s*\|\s*\|\s*/g, ' | ');

  // 7. Remove empty lines at start and end
  optimized = optimized.trim();

  // 8. Remove very short lines that are likely artifacts (unless they're part of a list)
  const finalLines = optimized.split('\n');
  optimized = finalLines
    .map((line, index) => {
      const trimmed = line.trim();
      // Keep lines that are:
      // - Not empty
      // - Longer than 2 characters
      // - Start with list markers (-, *, •, numbers)
      // - Are followed/preceded by content (not isolated)
      if (trimmed.length === 0) return line;
      if (trimmed.length > 2) return line;
      if (/^[-*•\d.]\s/.test(trimmed)) return line; // List item
      if (index > 0 && finalLines[index - 1].trim().length > 0 && 
          index < finalLines.length - 1 && finalLines[index + 1].trim().length > 0) {
        return line; // Between content lines
      }
      return ''; // Likely artifact
    })
    .filter(line => line.length > 0)
    .join('\n');

  // 9. Final cleanup: remove excessive blank lines again
  optimized = optimized.replace(/\n{3,}/g, '\n\n');

  return optimized.trim();
}

/**
 * Estimate token count for text (rough approximation).
 * Uses a simple heuristic: ~4 characters per token.
 * 
 * @param text Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  // This is a conservative estimate for English text
  return Math.ceil(text.length / 4);
}

/**
 * Get optimization statistics.
 * 
 * @param original Original text
 * @param optimized Optimized text
 * @returns Statistics about the optimization
 */
export function getOptimizationStats(original: string, optimized: string) {
  const originalTokens = estimateTokenCount(original);
  const optimizedTokens = estimateTokenCount(optimized);
  const reduction = originalTokens - optimizedTokens;
  const reductionPercent = originalTokens > 0 
    ? ((reduction / originalTokens) * 100).toFixed(1)
    : '0.0';

  return {
    originalLength: original.length,
    optimizedLength: optimized.length,
    originalTokens,
    optimizedTokens,
    reduction,
    reductionPercent: `${reductionPercent}%`,
  };
}

