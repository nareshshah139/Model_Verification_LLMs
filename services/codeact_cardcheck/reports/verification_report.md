# Model Card Verification Report

**Model ID:** CRS-LC-EL-2025-001

**Overall Consistency Score:** 32.5%

## Findings

### ⚠️ Not Found: PD: LogisticRegression scorecard

**Impact:** MEDIUM

---

### ⚠️ Not Found: LGD: two-stage (logistic + linear)

**Impact:** MEDIUM

---

### ⚠️ Not Found: Data splits: {'test': '2014', 'strategy': 'out_of_time'}

**Impact:** LOW

---

### ✅ Confirmed: Exclude post-origination columns: ['out_prncp', 'total_pymnt', 'recoveries', 'last_pymnt_d', 'last_pymnt_amnt', 'out_prncp_inv']

**Impact:** HIGH

---

### ⚠️ Not Found: Bounds: {'ccf': [0.0, 1.0], 'recovery_rate': [0.0, 1.0]}

**Impact:** MEDIUM

**Suggested Remediation:**

> Add clipping/bounds enforcement in code

---

## Summary

| Status | Count |
|--------|-------|
| not_found | 4 |
| confirmed | 1 |
