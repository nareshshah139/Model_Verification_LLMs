# 📊 Model Card Claims Dashboard - Quick Access Guide

## 🚀 How to Access

### Option 1: Direct URL
```bash
http://localhost:3000/dashboard
```

### Option 2: From Workspace
1. Navigate to the main workspace at `http://localhost:3000/workspace`
2. Look for dashboard navigation links

### Option 3: Delta View
```bash
http://localhost:3000/dashboard/delta
```
For comparing model card versions and tracking drift

## 📈 What You'll See

### Main Dashboard View

#### 1. Header Stats (4 Cards)
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│Total Claims │  Verified   │   Partial   │Not Verified │
│     196     │     86      │     24      │     33      │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

#### 2. Materiality Impact Analysis
```
Risk Breakdown:
- Critical Impact: Claims with contradictions or severe issues
- High Impact: Claims not found or with low confidence
- Medium Impact: Partially verified claims
- Low Impact: Verified claims with high confidence
```

#### 3. Overall Risk Assessment
```
Risk Level: MEDIUM
- Displays risk rationale from verification engine
- Highlights unverified claim count
```

#### 4. Claims by Category (Tabs)
- Model Overview
- Model Development
- Performance Metrics
- Assumptions & Limitations
- Governance & Compliance
- Technical Specifications
- And more...

#### 5. Detailed Claim Cards
Each claim shows:
```
┌────────────────────────────────────────────┐
│ ✓ claim_1                [Verified] [Low]  │
├────────────────────────────────────────────┤
│ Description: Model predicts Expected Loss  │
│                                            │
│ Metrics:                                   │
│  95% Confidence | 15 Materiality Score    │
│  3 Evidence Items | 0 Issues               │
│                                            │
│ Verification Notes: Strong evidence found  │
│ Code References: notebook.ipynb:Cell[1-5] │
└────────────────────────────────────────────┘
```

## 🎯 Priority Actions

### 1. Review Contradictions (3 claims) 🔴
These claims contradict the code - **highest priority**:
- Navigate to claims with "Contradiction" badge
- Review the contradiction details
- Update model card or fix code

### 2. Investigate Not Found (13 claims) 🟠
Evidence not found in codebase:
- May require additional notebook analysis
- Could indicate missing implementation
- Might be in documentation outside codebase

### 3. Complete Partial Verifications (24 claims) 🟡
Claims with some evidence but gaps:
- Review what evidence exists
- Identify what's missing
- Gather additional evidence

### 4. Verify Remaining Claims (20 claims) ⚪
Not yet analyzed:
- Run additional verification batches
- Extend analysis to more notebooks
- Include external documentation

## 🔍 Key Insights from Verification

### Strengths ✅
- Core modeling claims (PD, LGD, EAD) fully verified
- Data characteristics well-documented
- Expected Loss calculation clearly implemented
- Model monitoring via PSI implemented
- All T1 (critical) technical dimensions verified

### Gaps ⚠️
- 12-month PD time horizon not explicitly documented
- CECL/ASC 326 regulatory reporting not implemented
- Stress testing capabilities not found
- Portfolio exposure calculations missing
- Some performance metrics need updating

### Contradictions Found 🔴
- Test AUC is 0.703, not 0.688 as claimed
- Metrics stated as placeholders are actually computed
- Median CCF is 79%, not 93% as claimed
- Term vs. CCF relationship shows opposite direction

## 📊 Data Sources

### Claims File
```
Location: apps/api/public/model_card_claims.json
Size: 105 KB
Claims: 196 total
Categories: 10+ categories
```

### Verification File
```
Location: apps/api/public/model_card_claims_verification.json
Size: 187 KB
Verifications: 176 completed
Engine: CodeAct-v2.1
Last Updated: 2025-11-17T20:45:00Z
```

## 🔄 Keeping Dashboard Updated

### Manual Sync
```bash
cd /Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks
bash sync-claims-to-dashboard.sh
```

### Automatic Updates
The dashboard automatically fetches the JSON files on page load. Just refresh the browser after syncing.

## 💡 Tips

1. **Use Category Tabs** - Navigate efficiently between claim groups
2. **Focus on Materiality** - Sort by Critical/High impact first
3. **Check Code References** - Click through to see exact code locations
4. **Monitor Trends** - Use Delta View for version comparisons
5. **Export Reports** - Use browser's print/PDF for stakeholder reports

## 🆘 Troubleshooting

### Dashboard shows "No data available"
```bash
# Re-sync the data
bash sync-claims-to-dashboard.sh

# Verify files exist
ls -lh apps/api/public/model_card_claims*.json
```

### Stats don't match
```bash
# Check verification summary
jq '.verification_metadata.verification_summary' \
  apps/api/public/model_card_claims_verification.json
```

### Can't access dashboard
```bash
# Ensure Next.js dev server is running
cd apps/api
pnpm dev
```

## 📝 Recent Changes

- ✅ Fixed type definitions for verification statuses
- ✅ Added "contradiction" and "not_found" badges
- ✅ Enhanced materiality scoring algorithm
- ✅ Updated sync script with correct statistics
- ✅ Synced latest verification results (176/196 claims)

---

**Last Synced**: $(date)
**Verification Engine**: CodeAct-v2.1
**Status**: ✅ Ready to use
