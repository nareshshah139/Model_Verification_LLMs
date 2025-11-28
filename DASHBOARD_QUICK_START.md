# Dashboard Quick Start Guide

## What is the Dashboard?

The **Claims Dashboard** is a new tab in the Model Card Viewer that provides a comprehensive, at-a-glance view of all model card claims and their verification status, including a **materiality impact analysis** that helps you prioritize which claims need attention.

## Quick Access

1. **Start the application:**
   ```bash
   cd apps/api
   npm run dev
   ```

2. **Navigate to the workspace** in your browser

3. **Open a Model Card** from the file explorer

4. **Click the "Dashboard" tab** (first tab, with a dashboard icon)

## What You'll See

### 📊 Summary Statistics (Top Section)
Four key metrics at a glance:
- **Total Claims**: All claims in the model card
- **Verified**: Claims with strong evidence
- **Partial**: Claims with some evidence
- **Not Verified**: Claims lacking evidence

### 🎯 Materiality Impact Analysis
Shows the business impact of unverified claims:
- **Critical Impact** (Red): Requires immediate attention
- **High Impact** (Orange): Should be addressed soon
- **Medium Impact** (Yellow): Monitor closely
- **Low Impact** (Green): Acceptable risk level

Plus an **Overall Risk Assessment** with:
- Risk level (LOW/MEDIUM/HIGH)
- Risk rationale
- Based on all claims combined

### 📋 Claims by Category
Claims are organized into tabs by category:
- **Executive Summary**: High-level model descriptions
- **Purpose and Scope**: Use cases and boundaries
- **Key Model Outputs**: What the model produces
- *(And more categories as defined in your model card)*

### 📄 Individual Claim Cards
Each claim shows:

**Top Section:**
- ✅ Status icon (Verified/Partial/Not Verified/Insufficient)
- Status badge with color coding
- Materiality impact badge

**Metrics Grid:**
- **Confidence**: How certain is the verification (0-100%)
- **Materiality Score**: Impact if claim is wrong (0-100)
- **Evidence Items**: Number of supporting references found
- **Issues**: Number of contradictions or problems

**Details:**
- **Verification Notes**: Summary of findings
- **Impact Reason**: Why this materiality score
- **Issues & Contradictions**: Detailed problems with severity levels
- **Code References**: Links to notebooks and files

## Understanding Materiality

### What is Materiality?
Materiality measures **how much impact** a claim has when it's not fully verified. It helps you prioritize which claims to investigate first.

### How is it Calculated?
```
Base Score:
- Not Verified: 70 points
- Insufficient Evidence: 60 points  
- Partially Verified: 40 points
- Verified: 10 points

Additional Factors:
- Low confidence adds up to 30 points
- High severity issues add 20 points each
- Medium severity issues add 10 points each
- Low severity issues add 5 points each

Final score is capped at 100
```

### Materiality Levels:
- **75-100**: Critical Impact - Investigate immediately
- **50-74**: High Impact - Address soon
- **25-49**: Medium Impact - Monitor
- **0-24**: Low Impact - Acceptable

## Common Workflows

### 1. Quick Health Check
1. Open Dashboard
2. Check summary statistics
3. Review materiality analysis
4. If critical/high issues exist, proceed to detailed review

### 2. Prioritized Investigation
1. Sort claims by materiality score (highest first)
2. Focus on Critical and High impact claims
3. Review verification notes and evidence
4. Check contradictions for specific issues
5. Use code references to verify implementation

### 3. Gap Analysis
1. Scroll to "Overall Assessment" section
2. Review "Gaps" list
3. Review "Recommendations"
4. Create action items based on recommendations

### 4. Compliance Review
1. Navigate through each category tab
2. Ensure all high-priority claims are verified
3. Document any remaining issues
4. Export/screenshot for reporting

## Color Guide

### Status Colors:
- 🟢 **Green**: Verified (good to go)
- 🟡 **Yellow**: Partially verified (needs attention)
- 🔴 **Red**: Not verified (action required)
- 🟠 **Orange**: Insufficient evidence (more data needed)

### Materiality Colors:
- 🔴 **Red**: Critical impact
- 🟠 **Orange**: High impact
- 🟡 **Yellow**: Medium impact
- 🟢 **Green**: Low impact

### Severity Colors (Issues):
- 🔴 **Red border**: High severity
- 🟡 **Yellow border**: Medium severity
- 🔵 **Blue border**: Low severity

## Tips for Best Results

1. **Start with Critical/High Impact Claims**: These are your highest priority
2. **Review Evidence Count**: Low evidence count suggests need for more verification
3. **Check Confidence Scores**: Low confidence means uncertainty in results
4. **Read Verification Notes**: Provides context for the scores
5. **Use Code References**: Trace claims back to implementation
6. **Monitor Trends**: Regular reviews show improvement over time

## Example Use Cases

### For Model Validators:
- Quickly identify which claims need deeper investigation
- Prioritize verification efforts based on materiality
- Track verification progress across model card sections

### For Model Developers:
- See which claims lack implementation evidence
- Find gaps between model card and code
- Get specific recommendations for improvement

### For Compliance Officers:
- Assess overall risk level at a glance
- Document verification status for audits
- Identify policy/governance gaps

### For Project Managers:
- Track model card quality metrics
- Prioritize technical debt backlog
- Communicate risk to stakeholders

## What's Next?

After reviewing the dashboard:

1. **High Priority**: Address Critical and High materiality claims
2. **Code Review**: Check code references for discrepancies
3. **Documentation**: Update model card based on findings
4. **Re-verification**: Run verification again to confirm improvements
5. **Regular Monitoring**: Check dashboard regularly for new issues

## Data Sources

The dashboard loads data from:
- `model_card_claims.json`: Original claims from model card
- `model_card_claims_verification.json`: Verification results from CodeAct engine

Both files must be present in `/apps/api/public/` for the dashboard to work.

## Troubleshooting

**Dashboard tab is disabled:**
- Ensure JSON files are in `/apps/api/public/`
- Check browser console for loading errors
- Verify JSON files are valid (not corrupted)

**No data showing:**
- Check that verification has been run
- Verify JSON files contain data
- Reload the page

**Wrong data showing:**
- Ensure JSON files are for the correct model card
- Check file timestamps to verify they're recent
- Re-run verification if needed

## Need Help?

- Check `CLAIMS_DASHBOARD_IMPLEMENTATION.md` for technical details
- Review verification results in the "Verification" tab
- Inspect JSON files directly for raw data
- Check browser console for errors

---

**Pro Tip**: The dashboard is designed to be self-explanatory. Hover over elements and explore the tabs - the visual indicators and color coding will guide you! 🎯

