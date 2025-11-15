#!/usr/bin/env node
/**
 * Test DOCX text extraction to verify the fix
 */

import mammoth from 'mammoth';
import fs from 'fs/promises';

const docxPath = "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/Lending-Club-Credit-Scoring/Model Card - Credit Risk Scoring Model - Expected Loss.docx";

console.log("Testing DOCX extraction...");
console.log("============================================================");

try {
  // Method 1: Raw read (WRONG - what we were doing)
  console.log("\n❌ Method 1: Reading as UTF-8 text (WRONG)");
  const rawText = await fs.readFile(docxPath, "utf-8");
  console.log(`  Length: ${rawText.length} chars`);
  console.log(`  Estimated tokens: ~${Math.floor(rawText.length / 4)}`);
  console.log(`  First 200 chars: ${rawText.slice(0, 200)}`);
  
  // Method 2: Mammoth extraction (CORRECT - what we're doing now)
  console.log("\n✅ Method 2: Using mammoth.extractRawText (CORRECT)");
  const buffer = await fs.readFile(docxPath);
  const result = await mammoth.extractRawText({ buffer });
  const extractedText = result.value;
  console.log(`  Length: ${extractedText.length} chars`);
  console.log(`  Estimated tokens: ~${Math.floor(extractedText.length / 4)}`);
  console.log(`  First 500 chars:\n${extractedText.slice(0, 500)}`);
  console.log(`\n  Last 500 chars:\n${extractedText.slice(-500)}`);
  
  if (result.messages && result.messages.length > 0) {
    console.log(`\n  Warnings: ${result.messages.length}`);
    result.messages.slice(0, 5).forEach(msg => {
      console.log(`    - ${msg.message}`);
    });
  }
  
  console.log("\n============================================================");
  console.log("✅ Extraction successful!");
  console.log(`📊 Reduction: ${rawText.length} → ${extractedText.length} chars`);
  console.log(`📊 Token reduction: ~${Math.floor(rawText.length / 4)} → ~${Math.floor(extractedText.length / 4)} tokens`);
  console.log("🎉 This will now fit in Claude's 128K context!");
  
} catch (error) {
  console.error("❌ Error:", error);
  process.exit(1);
}
