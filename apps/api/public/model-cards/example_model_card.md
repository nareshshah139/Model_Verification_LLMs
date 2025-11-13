# Model Card: Lending Club Credit Scoring Model

**Model ID:** CRS-LC-EL-2025-001

## Model Family

### Probability of Default (PD)
- **Method:** Logistic Regression scorecard
- **Scale:** 300-850
- **Risk Classes:** AA, A, AB, BB, B, BC, C, CD, DD, F

### Loss Given Default (LGD)
- **Method:** Two-stage hurdle model
  - Stage 1: Logistic regression for recovery incidence (recovery > 0)
  - Stage 2: Linear regression for recovery magnitude

### Exposure At Default (EAD)
- **Method:** Linear regression on Credit Conversion Factor (CCF)
- **Bounds:** CCF clipped to [0, 1]

## Data Splits

- **Training:** 2007-2013
- **Test:** 2014
- **Monitoring:** 2015
- **Strategy:** Out-of-time validation

## Features Policy

- **Timepoint:** Application-only features
- **Excluded Columns:**
  - `out_prncp` (outstanding principal)
  - `total_pymnt` (total payment)
  - `recoveries` (recovery amounts)
  - `last_pymnt_d` (last payment date)
  - `last_pymnt_amnt` (last payment amount)
  - `out_prncp_inv` (outstanding principal invested)

## Bounds

- **CCF:** [0, 1]
- **Recovery Rate:** [0, 1]

## Performance Metrics

### PD Model
- **AUC (Test):** > 0.65
- **KS Statistic:** > 0.25
- **Brier Score:** Not reported

### LGD Model
- **MAE (Test):** Not reported
- **R² (Test):** Not reported

### EAD Model
- **MAE (Test):** Not reported
- **R² (Test):** Not reported

## Portfolio Expected Loss (EL)
- **Portfolio Error %:** <= 1.5%

## Governance

This model complies with:
- SR 11-7 guidance
- CECL requirements
- Internal model governance standards

