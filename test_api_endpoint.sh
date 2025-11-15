#!/bin/bash
# Test the model card verification endpoint

echo "Testing model card verification API..."
echo "========================================"
echo ""

# Test with the example markdown file
echo "Test 1: Markdown model card"
curl -X POST http://localhost:3001/api/verify/model-card \
  -H "Content-Type: application/json" \
  -d '{
    "modelCardPath": "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/apps/api/public/model-cards/example_model_card.md",
    "repoPath": "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/Lending-Club-Credit-Scoring"
  }' 2>&1 | head -50

echo -e "\n\n"
echo "Test 2: DOCX model card"
curl -X POST http://localhost:3001/api/verify/model-card \
  -H "Content-Type: application/json" \
  -d '{
    "modelCardPath": "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/Lending-Club-Credit-Scoring/Model Card - Credit Risk Scoring Model - Expected Loss.docx",
    "repoPath": "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/Lending-Club-Credit-Scoring"
  }' 2>&1 | head -50

