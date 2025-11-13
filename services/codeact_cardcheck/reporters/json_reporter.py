"""JSON reporter for verification results."""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional


class JSONReporter:
    """Reporter that outputs verification results as JSON."""

    def __init__(self, output_path: str):
        """
        Initialize JSON reporter.

        Args:
            output_path: Path to output JSON file
        """
        self.output_path = Path(output_path)

    def emit(self, report: Dict[str, Any]) -> None:
        """
        Emit verification report as JSON.

        Args:
            report: Verification report dictionary
        """
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

    @staticmethod
    def create_report(
        claims_spec: Dict[str, Any],
        evidence_table: Dict[str, List[Dict[str, Any]]],
        metrics_diffs: Optional[Dict[str, Any]] = None,
        consistency_score: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Create structured verification report.

        Args:
            claims_spec: Parsed ClaimsSpec
            evidence_table: Evidence collected from scans
            metrics_diffs: Optional metrics differences from dynamic runs
            consistency_score: Optional overall consistency score

        Returns:
            Structured report dictionary
        """
        findings = []

        # Resolve claims vs evidence
        for claim_type, claim_value in claims_spec.items():
            if claim_type == "family":
                findings.extend(
                    JSONReporter._check_family_claims(claim_value, evidence_table)
                )
            elif claim_type == "splits":
                findings.extend(
                    JSONReporter._check_splits_claims(claim_value, evidence_table)
                )
            elif claim_type == "features_policy":
                findings.extend(
                    JSONReporter._check_leakage_claims(claim_value, evidence_table)
                )
            elif claim_type == "bounds":
                findings.extend(
                    JSONReporter._check_bounds_claims(claim_value, evidence_table)
                )

        return {
            "model_id": claims_spec.get("model_id"),
            "consistency_score": consistency_score,
            "findings": findings,
            "evidence": evidence_table,
            "metrics_diffs": metrics_diffs or {},
            "claims_spec": claims_spec,
        }

    @staticmethod
    def _check_family_claims(
        family_claims: Dict[str, str], evidence_table: Dict[str, List[Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:
        """Check model family claims against evidence."""
        findings = []

        # Check PD
        if "pd" in family_claims:
            expected = family_claims["pd"]
            pd_evidence = evidence_table.get("algorithms", [])
            pd_logistic = [
                e for e in pd_evidence if e.get("rule_id") == "pd-logistic-used"
            ]
            pd_trees = [
                e for e in pd_evidence if e.get("rule_id") == "tree-boosting-detected"
            ]

            if expected == "logistic_scorecard":
                if pd_logistic:
                    findings.append(
                        {
                            "claim": "PD: LogisticRegression scorecard",
                            "status": "confirmed",
                            "evidence": pd_logistic,
                            "impact": "high",
                        }
                    )
                elif pd_trees:
                    findings.append(
                        {
                            "claim": "PD: LogisticRegression scorecard",
                            "status": "contradicted",
                            "evidence": pd_trees,
                            "impact": "high",
                            "remediation": "Update model card to reflect actual algorithm or change code to use LogisticRegression",
                        }
                    )
                else:
                    findings.append(
                        {
                            "claim": "PD: LogisticRegression scorecard",
                            "status": "not_found",
                            "impact": "medium",
                        }
                    )

        # Check LGD
        if "lgd" in family_claims:
            expected = family_claims["lgd"]
            lgd_evidence = evidence_table.get("algorithms", [])
            lgd_logistic = [
                e for e in lgd_evidence if e.get("rule_id") == "lgd-incidence-logistic"
            ]
            lgd_linear = [
                e for e in lgd_evidence if e.get("rule_id") == "lgd-magnitude-linear"
            ]
            lgd_beta = [
                e for e in lgd_evidence if e.get("rule_id") == "beta-regression-detected"
            ]

            if expected == "two_stage_hurdle":
                if lgd_logistic and lgd_linear:
                    findings.append(
                        {
                            "claim": "LGD: two-stage (logistic + linear)",
                            "status": "confirmed",
                            "evidence": lgd_logistic + lgd_linear,
                            "impact": "high",
                        }
                    )
                elif lgd_beta:
                    findings.append(
                        {
                            "claim": "LGD: two-stage (logistic + linear)",
                            "status": "contradicted",
                            "evidence": lgd_beta,
                            "impact": "high",
                            "remediation": "Update model card to reflect Beta regression or implement two-stage LGD",
                        }
                    )
                else:
                    findings.append(
                        {
                            "claim": "LGD: two-stage (logistic + linear)",
                            "status": "not_found",
                            "impact": "medium",
                        }
                    )

        return findings

    @staticmethod
    def _check_splits_claims(
        splits_claims: Dict[str, str], evidence_table: Dict[str, List[Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:
        """Check data split claims against evidence."""
        findings = []
        splits_evidence = evidence_table.get("splits", [])

        if splits_evidence:
            findings.append(
                {
                    "claim": f"Data splits: {splits_claims}",
                    "status": "confirmed",
                    "evidence": splits_evidence,
                    "impact": "medium",
                }
            )
        else:
            findings.append(
                {
                    "claim": f"Data splits: {splits_claims}",
                    "status": "not_found",
                    "impact": "low",
                }
            )

        return findings

    @staticmethod
    def _check_leakage_claims(
        features_policy: Dict[str, Any], evidence_table: Dict[str, List[Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:
        """Check leakage exclusion claims."""
        findings = []
        leakage_evidence = evidence_table.get("leakage", [])

        excluded = features_policy.get("exclude_columns", [])
        if leakage_evidence:
            findings.append(
                {
                    "claim": f"Exclude post-origination columns: {excluded}",
                    "status": "contradicted",
                    "evidence": leakage_evidence,
                    "impact": "high",
                    "remediation": "Remove post-origination columns from feature sets",
                }
            )
        else:
            findings.append(
                {
                    "claim": f"Exclude post-origination columns: {excluded}",
                    "status": "confirmed",
                    "impact": "high",
                }
            )

        return findings

    @staticmethod
    def _check_bounds_claims(
        bounds_claims: Dict[str, List[float]], evidence_table: Dict[str, List[Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:
        """Check bounds/clipping claims."""
        findings = []
        metrics_evidence = evidence_table.get("metrics", [])

        clip_evidence = [
            e for e in metrics_evidence if e.get("rule_id") == "clip-rates-0-1"
        ]

        if bounds_claims and clip_evidence:
            findings.append(
                {
                    "claim": f"Bounds: {bounds_claims}",
                    "status": "confirmed",
                    "evidence": clip_evidence,
                    "impact": "medium",
                }
            )
        elif bounds_claims:
            findings.append(
                {
                    "claim": f"Bounds: {bounds_claims}",
                    "status": "not_found",
                    "impact": "medium",
                    "remediation": "Add clipping/bounds enforcement in code",
                }
            )

        return findings

