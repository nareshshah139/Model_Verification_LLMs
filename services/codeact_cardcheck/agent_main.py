"""Main CodeAct CardCheck agent orchestration."""

import argparse
import json
from pathlib import Path
from typing import Dict, Any, Optional, List, Callable
import tempfile
import shutil

from tools import (
    RepoTool,
    NotebookTool,
    FormatterTool,
    AstGrepTool,
    PyExecTool,
    CardParser,
    LLMExtractorTool,
)
from reporters import JSONReporter, MarkdownReporter

# Get rules directory relative to this script
RULES_DIR = Path(__file__).parent / "rules"


class CardCheckAgent:
    """CodeAct-style agent for verifying model cards against code."""

    def __init__(
        self,
        workdir: Optional[str] = None,
        runtime_enabled: bool = False,
        sg_binary: str = "sg",
        llm_provider: str = "openai",
    ):
        """
        Initialize CardCheck agent.

        Args:
            workdir: Working directory for operations
            runtime_enabled: Whether to enable dynamic metric recomputation
            sg_binary: Path to ast-grep binary
            llm_provider: LLM provider for metric extraction (openai, anthropic)
        """
        self.workdir = Path(workdir) if workdir else Path(tempfile.mkdtemp())
        self.runtime_enabled = runtime_enabled
        self.sg_binary = sg_binary
        self.llm_provider = llm_provider

        # Initialize tools
        self.repo_tool = RepoTool(str(self.workdir))
        self.nb_tool = NotebookTool(str(self.workdir))
        self.formatter_tool = FormatterTool(str(self.workdir))
        self.astgrep_tool = AstGrepTool(str(self.workdir), sg_binary=sg_binary)
        self.pyexec_tool = PyExecTool(str(self.workdir))
        self.card_parser = CardParser()
        self.llm_extractor = LLMExtractorTool(str(self.workdir), llm_provider=llm_provider)

    def verify(
        self,
        model_card_path: str,
        repo_url: Optional[str] = None,
        repo_path: Optional[str] = None,
        output_dir: Optional[str] = None,
        progress_callback: Optional[Callable[[str, Dict[str, Any]], None]] = None,
    ) -> Dict[str, Any]:
        """
        Main verification workflow.

        Args:
            model_card_path: Path to model card file
            repo_url: Git repository URL (if cloning)
            repo_path: Local repository path (if using existing)
            output_dir: Output directory for reports
            progress_callback: Optional callback function(message: str, data: Dict[str, Any]) for progress updates

        Returns:
            Verification report dictionary
        """
        def emit(message: str, data: Optional[Dict[str, Any]] = None):
            """Helper to emit progress updates."""
            if progress_callback:
                progress_callback(message, data or {})
            else:
                print(message)

        output_dir = Path(output_dir) if output_dir else self.workdir / "reports"
        output_dir.mkdir(parents=True, exist_ok=True)

        # Step 1: Parse model card → ClaimsSpec
        emit("Step 1: Parsing model card...")
        card_text = Path(model_card_path).read_text(encoding="utf-8")
        claims_spec = self.card_parser.parse(card_text)
        emit(f"Parsed ClaimsSpec: {json.dumps(claims_spec, indent=2)}", {"step": 1, "claims_spec": claims_spec})

        # Step 2: Clone repo or use existing
        emit("\nStep 2: Preparing repository...", {"step": 2})
        if repo_url:
            emit(f"Cloning repository from {repo_url}...")
            repo_path = self.repo_tool.clone(repo_url)
            emit(f"Repository cloned successfully", {"step": 2, "repo_path": repo_path})
        elif not repo_path:
            raise ValueError("Either repo_url or repo_path must be provided")

        repo_path_obj = Path(repo_path)

        # Step 3: Find notebooks and Python files
        emit("\nStep 3: Discovering code artifacts...", {"step": 3})
        notebook_paths = self.repo_tool.glob("**/*.ipynb", root=str(repo_path_obj))
        emit(f"Found {len(notebook_paths)} notebooks", {"step": 3, "notebook_count": len(notebook_paths)})
        
        python_paths = self.repo_tool.glob("**/*.py", root=str(repo_path_obj))
        emit(f"Found {len(python_paths)} Python files", {"step": 3, "python_count": len(python_paths)})

        # Format Python files
        emit("\nStep 4: Formatting code...", {"step": 4})
        self.formatter_tool.format(
            [str(repo_path_obj / py) for py in python_paths]
        )
        emit("Code formatting complete", {"step": 4})

        # Step 4: Run ast-grep rulepacks
        emit("\nStep 5: Running ast-grep scans...", {"step": 5})
        evidence_table = {}

        rulepacks = [
            ("algorithms", RULES_DIR / "algorithms.yaml"),
            ("preprocessing", RULES_DIR / "preprocessing.yaml"),
            ("leakage", RULES_DIR / "leakage.yaml"),
            ("splits", RULES_DIR / "splits.yaml"),
            ("metrics", RULES_DIR / "metrics.yaml"),
            ("packaging", RULES_DIR / "packaging.yaml"),
        ]

        for idx, (category, rulepack_path) in enumerate(rulepacks):
            emit(f"  Scanning with {rulepack_path.name}...", {"step": 5, "category": category, "progress": f"{idx+1}/{len(rulepacks)}"})
            matches = self.astgrep_tool.scan(
                str(rulepack_path),
                paths=[str(repo_path_obj)],
                json_output=True,
            )

            # Annotate matches with rule IDs
            annotated_matches = []
            for match in matches:
                # Extract rule ID from match if available
                rule_id = match.get("rule", {}).get("id") or match.get("id")
                annotated_match = {
                    **match,
                    "rule_id": rule_id,
                    "category": category,
                }
                annotated_matches.append(annotated_match)

            evidence_table[category] = annotated_matches
            emit(f"    Found {len(annotated_matches)} matches", {"step": 5, "category": category, "match_count": len(annotated_matches)})

        # Step 5: Extract metrics from notebook outputs using LLM (parallel processing)
        emit("\nStep 6: Extracting metrics from notebook outputs using LLM...", {"step": 6})
        if notebook_paths:
            emit(f"Processing {len(notebook_paths)} notebooks in parallel...", {"step": 6, "status": "extracting"})
            output_metrics = self.llm_extractor.extract_metrics_from_notebooks(
                notebook_paths=[str(repo_path_obj / nb) for nb in notebook_paths],
                claimed_metrics=claims_spec.get("metrics", {})
            )
            emit(f"Extracted {len(output_metrics)} metrics from outputs", 
                 {"step": 6, "metric_count": len(output_metrics), "method": "llm"})
        else:
            emit("No notebooks to extract metrics from", {"step": 6, "metric_count": 0})
            output_metrics = {}

        # Step 6: Compare claimed vs actual metrics
        emit("\nStep 7: Comparing claimed vs actual metrics...", {"step": 7})
        metrics_diffs = self._compare_metrics(claims_spec, output_metrics)
        if metrics_diffs:
            emit(f"Found {len(metrics_diffs)} metric discrepancies", 
                 {"step": 7, "discrepancy_count": len(metrics_diffs)})
            for metric, diff in metrics_diffs.items():
                emit(f"  {metric}: claimed={diff['claimed']}, actual={diff['actual']}, diff={diff['diff']:.4f}")
        else:
            emit("All metrics match claimed values", {"step": 7})

        # Step 7: (Optional) Execute notebooks for fresh validation
        if self.runtime_enabled:
            emit("\nStep 8: Running notebooks for fresh metric validation...", {"step": 8})
            execution_metrics = self._execute_notebooks_for_metrics(
                [str(repo_path_obj / nb) for nb in notebook_paths]
            )
            # Merge with existing metrics
            output_metrics.update(execution_metrics)
            emit(f"Executed notebooks and extracted {len(execution_metrics)} fresh metrics", 
                 {"step": 8, "metric_count": len(execution_metrics)})

        # Step 8: Calculate consistency score
        emit("\nStep 9: Calculating consistency score...", {"step": 9})
        consistency_score = self._calculate_consistency_score(
            claims_spec, evidence_table, metrics_diffs
        )
        emit(f"Consistency score: {consistency_score:.1%}", {"step": 9, "consistency_score": consistency_score})

        # Step 9: Generate reports
        emit("\nStep 10: Generating reports...", {"step": 10})
        report = JSONReporter.create_report(
            claims_spec, evidence_table, metrics_diffs, consistency_score
        )

        json_reporter = JSONReporter(str(output_dir / "verification_report.json"))
        json_reporter.emit(report)

        md_reporter = MarkdownReporter(str(output_dir / "verification_report.md"))
        md_reporter.emit(report)

        emit(f"\nReports written to {output_dir}", {"step": 10, "output_dir": str(output_dir)})
        emit("  - verification_report.json")
        emit("  - verification_report.md")

        emit("\nVerification complete!", {"step": 11, "report": report})
        return report

    def _extract_notebook_outputs_deprecated(self, notebook_paths: List[str]) -> Dict[str, Any]:
        """
        Extract metrics from notebook output cells.
        
        Args:
            notebook_paths: List of notebook file paths
            
        Returns:
            Dictionary of extracted metrics
        """
        import nbformat
        import re
        
        metrics = {}
        
        for nb_path in notebook_paths:
            try:
                nb_path_obj = Path(nb_path)
                if not nb_path_obj.exists():
                    continue
                    
                # Read notebook (preserves outputs!)
                nb = nbformat.read(str(nb_path_obj), as_version=4)
                
                # Extract from each cell
                for cell_idx, cell in enumerate(nb.cells):
                    if cell.cell_type != "code" or not cell.outputs:
                        continue
                    
                    # Process each output
                    for output in cell.outputs:
                        text = ""
                        
                        # Stream output (print statements)
                        if output.output_type == "stream":
                            text = output.text if isinstance(output.text, str) else "".join(output.text)
                        
                        # Execute result (returned values)
                        elif output.output_type == "execute_result":
                            data = output.get("data", {})
                            if "text/plain" in data:
                                text = data["text/plain"]
                        
                        # Display data
                        elif output.output_type == "display_data":
                            data = output.get("data", {})
                            if "text/plain" in data:
                                text = data["text/plain"]
                        
                        if not text:
                            continue
                        
                        # Extract metrics using regex patterns
                        # AUC patterns
                        auc_patterns = [
                            r'(?:AUC|auc|roc_auc)[:\s=]+([0-9.]+)',
                            r'(?:ROC|roc)\s*(?:AUC|auc)[:\s=]+([0-9.]+)',
                            r'roc_auc_score[:\s=]+([0-9.]+)',
                        ]
                        for pattern in auc_patterns:
                            match = re.search(pattern, text, re.IGNORECASE)
                            if match:
                                metrics['auc'] = float(match.group(1))
                                metrics['_auc_file'] = str(nb_path_obj.name)
                                metrics['_auc_cell'] = cell_idx
                        
                        # KS statistic patterns
                        ks_patterns = [
                            r'(?:KS|ks)[:\s=]+([0-9.]+)',
                            r'(?:Kolmogorov|kolmogorov)[:\s-]*(?:Smirnov|smirnov)[:\s=]+([0-9.]+)',
                        ]
                        for pattern in ks_patterns:
                            match = re.search(pattern, text, re.IGNORECASE)
                            if match:
                                metrics['ks'] = float(match.group(1))
                                metrics['_ks_file'] = str(nb_path_obj.name)
                                metrics['_ks_cell'] = cell_idx
                        
                        # Gini coefficient patterns
                        gini_patterns = [
                            r'(?:Gini|gini)[:\s=]+([0-9.]+)',
                            r'gini_coefficient[:\s=]+([0-9.]+)',
                        ]
                        for pattern in gini_patterns:
                            match = re.search(pattern, text, re.IGNORECASE)
                            if match:
                                metrics['gini'] = float(match.group(1))
                                metrics['_gini_file'] = str(nb_path_obj.name)
                                metrics['_gini_cell'] = cell_idx
                        
                        # Accuracy patterns
                        acc_patterns = [
                            r'(?:Accuracy|accuracy|acc)[:\s=]+([0-9.]+)',
                            r'accuracy_score[:\s=]+([0-9.]+)',
                        ]
                        for pattern in acc_patterns:
                            match = re.search(pattern, text, re.IGNORECASE)
                            if match:
                                metrics['accuracy'] = float(match.group(1))
                                metrics['_accuracy_file'] = str(nb_path_obj.name)
                                metrics['_accuracy_cell'] = cell_idx
                        
                        # Dataset size patterns
                        size_patterns = [
                            r'(?:train|training).*?([0-9,]+)\s*(?:rows|samples|records)',
                            r'(?:test|testing).*?([0-9,]+)\s*(?:rows|samples|records)',
                        ]
                        for pattern in size_patterns:
                            match = re.search(pattern, text, re.IGNORECASE)
                            if match:
                                size_str = match.group(1).replace(',', '')
                                if 'train' in pattern:
                                    metrics['train_size'] = int(size_str)
                                else:
                                    metrics['test_size'] = int(size_str)
                        
            except Exception as e:
                # Log error but continue with other notebooks
                print(f"Error extracting from {nb_path}: {e}")
                continue
        
        return metrics

    def _compare_metrics(
        self, claims_spec: Dict[str, Any], output_metrics: Dict[str, Any]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Compare claimed metrics with actual outputs.
        
        Args:
            claims_spec: Claimed metrics from model card
            output_metrics: Actual metrics from notebook outputs
            
        Returns:
            Dictionary of discrepancies
        """
        discrepancies = {}
        claimed_metrics = claims_spec.get("metrics", {})
        
        # Flatten nested metrics structure
        flat_claimed = {}
        for model_type, metrics in claimed_metrics.items():
            if isinstance(metrics, dict):
                for metric, value in metrics.items():
                    flat_claimed[metric] = value
            else:
                flat_claimed[model_type] = metrics
        
        # Compare each claimed metric with actual
        for metric, claimed_str in flat_claimed.items():
            if metric not in output_metrics:
                continue  # No output to compare
            
            actual = output_metrics[metric]
            
            # Parse claimed value (might be "0.85" or ">0.80")
            claimed = None
            if isinstance(claimed_str, (int, float)):
                claimed = float(claimed_str)
            elif isinstance(claimed_str, str):
                # Extract numeric value
                import re
                match = re.search(r'([0-9.]+)', claimed_str)
                if match:
                    claimed = float(match.group(1))
            
            if claimed is None:
                continue
            
            # Calculate difference
            diff = actual - claimed
            
            # Flag if difference is significant (>5% for ratios, >0.05 for decimals)
            threshold = 0.05 if 0 <= claimed <= 1 else claimed * 0.05
            
            if abs(diff) > threshold:
                discrepancies[metric] = {
                    "claimed": claimed,
                    "actual": actual,
                    "diff": diff,
                    "threshold": threshold,
                    "file": output_metrics.get(f"_{metric}_file", "unknown"),
                    "cell": output_metrics.get(f"_{metric}_cell", -1),
                }
        
        return discrepancies

    def _execute_notebooks_for_metrics(self, notebook_paths: List[str]) -> Dict[str, Any]:
        """
        Execute notebooks to get fresh metrics (if runtime_enabled).
        
        Args:
            notebook_paths: List of notebook file paths
            
        Returns:
            Dictionary of executed metrics
        """
        metrics = {}
        
        for nb_path in notebook_paths:
            try:
                # Execute notebook
                result = self.nb_tool.run(nb_path)
                
                if result.get("success"):
                    # Extract metrics from outputs
                    outputs = result.get("outputs", {})
                    for cell_source, output_text in outputs.items():
                        # Similar extraction as _extract_notebook_outputs
                        # but from freshly executed results
                        import re
                        
                        auc_match = re.search(r'(?:AUC|auc)[:\s=]+([0-9.]+)', output_text, re.IGNORECASE)
                        if auc_match:
                            metrics['auc_executed'] = float(auc_match.group(1))
                        
                        ks_match = re.search(r'(?:KS|ks)[:\s=]+([0-9.]+)', output_text, re.IGNORECASE)
                        if ks_match:
                            metrics['ks_executed'] = float(ks_match.group(1))
                            
            except Exception as e:
                print(f"Error executing {nb_path}: {e}")
                continue
        
        return metrics

    def _calculate_consistency_score(
        self, 
        claims_spec: Dict[str, Any], 
        evidence_table: Dict[str, List[Dict[str, Any]]],
        metrics_diffs: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> float:
        """
        Calculate overall consistency score.

        Weights:
        - Algorithm family match: 30%
        - Data split compliance: 15%
        - Leakage exclusion: 25%
        - Bound/clipping & scaling: 10%
        - Artifacts & seeds: 5%
        - Metrics agreement: 15%
        """
        scores = []

        # Algorithm family match (30%)
        family_score = self._score_family_match(claims_spec, evidence_table)
        scores.append(("algorithm_family", family_score, 0.30))

        # Data split compliance (15%)
        splits_score = self._score_splits_match(claims_spec, evidence_table)
        scores.append(("splits", splits_score, 0.15))

        # Leakage exclusion (25%)
        leakage_score = self._score_leakage_match(claims_spec, evidence_table)
        scores.append(("leakage", leakage_score, 0.25))

        # Bound/clipping & scaling (10%)
        bounds_score = self._score_bounds_match(claims_spec, evidence_table)
        scores.append(("bounds", bounds_score, 0.10))

        # Artifacts & seeds (5%)
        packaging_score = self._score_packaging_match(evidence_table)
        scores.append(("packaging", packaging_score, 0.05))

        # Metrics agreement (15%)
        metrics_score = self._score_metrics_match(claims_spec, metrics_diffs)
        scores.append(("metrics", metrics_score, 0.15))

        # Weighted sum
        total_score = sum(score * weight for _, score, weight in scores)
        return total_score

    def _score_family_match(
        self, claims_spec: Dict[str, Any], evidence_table: Dict[str, List[Dict[str, Any]]]
    ) -> float:
        """Score algorithm family matches."""
        family_claims = claims_spec.get("family", {})
        if not family_claims:
            return 0.5  # Neutral if no claims

        algorithms_evidence = evidence_table.get("algorithms", [])
        matches = 0
        total = 0

        # Check PD
        if "pd" in family_claims:
            total += 1
            expected = family_claims["pd"]
            if expected == "logistic_scorecard":
                pd_logistic = [
                    e for e in algorithms_evidence
                    if e.get("rule_id") == "pd-logistic-used"
                ]
                if pd_logistic:
                    matches += 1

        # Check LGD
        if "lgd" in family_claims:
            total += 1
            expected = family_claims["lgd"]
            if expected == "two_stage_hurdle":
                lgd_logistic = [
                    e for e in algorithms_evidence
                    if e.get("rule_id") == "lgd-incidence-logistic"
                ]
                lgd_linear = [
                    e for e in algorithms_evidence
                    if e.get("rule_id") == "lgd-magnitude-linear"
                ]
                if lgd_logistic and lgd_linear:
                    matches += 1

        # Check EAD
        if "ead" in family_claims:
            total += 1
            expected = family_claims["ead"]
            if expected == "linear_regression_on_ccf":
                ead_linear = [
                    e for e in algorithms_evidence
                    if e.get("rule_id") == "ead-linear-on-ccf"
                ]
                if ead_linear:
                    matches += 1

        return matches / total if total > 0 else 0.5

    def _score_splits_match(
        self, claims_spec: Dict[str, Any], evidence_table: Dict[str, List[Dict[str, Any]]]
    ) -> float:
        """Score data split matches."""
        splits_claims = claims_spec.get("splits", {})
        splits_evidence = evidence_table.get("splits", [])

        if not splits_claims:
            return 0.5

        return 1.0 if splits_evidence else 0.0

    def _score_leakage_match(
        self, claims_spec: Dict[str, Any], evidence_table: Dict[str, List[Dict[str, Any]]]
    ) -> float:
        """Score leakage exclusion matches."""
        leakage_evidence = evidence_table.get("leakage", [])
        features_policy = claims_spec.get("features_policy", {})

        if not features_policy.get("exclude_columns"):
            return 0.5

        # No leakage evidence = good (score 1.0)
        # Leakage evidence = bad (score 0.0)
        return 0.0 if leakage_evidence else 1.0

    def _score_bounds_match(
        self, claims_spec: Dict[str, Any], evidence_table: Dict[str, List[Dict[str, Any]]]
    ) -> float:
        """Score bounds/clipping matches."""
        bounds_claims = claims_spec.get("bounds", {})
        metrics_evidence = evidence_table.get("metrics", [])

        if not bounds_claims:
            return 0.5

        clip_evidence = [
            e for e in metrics_evidence if e.get("rule_id") == "clip-rates-0-1"
        ]

        return 1.0 if clip_evidence else 0.0

    def _score_packaging_match(self, evidence_table: Dict[str, List[Dict[str, Any]]]) -> float:
        """Score packaging/artifacts matches."""
        packaging_evidence = evidence_table.get("packaging", [])

        joblib_dump = [
            e for e in packaging_evidence if e.get("rule_id") == "joblib-dump-model"
        ]
        seed_set = [
            e for e in packaging_evidence if e.get("rule_id") == "seed-set"
        ]

        score = 0.0
        if joblib_dump:
            score += 0.5
        if seed_set:
            score += 0.5

        return score

    def _score_metrics_match(
        self, claims_spec: Dict[str, Any], metrics_diffs: Optional[Dict[str, Dict[str, Any]]]
    ) -> float:
        """Score metric agreement between claims and actual outputs."""
        if not metrics_diffs:
            # No discrepancies found - perfect match!
            return 1.0
        
        claimed_metrics = claims_spec.get("metrics", {})
        if not claimed_metrics:
            # No metrics claimed
            return 0.5
        
        # Count total claimed metrics
        total_metrics = 0
        for model_type, metrics in claimed_metrics.items():
            if isinstance(metrics, dict):
                total_metrics += len(metrics)
            else:
                total_metrics += 1
        
        if total_metrics == 0:
            return 0.5
        
        # Calculate how many match (total - discrepancies)
        matching_metrics = max(0, total_metrics - len(metrics_diffs))
        
        return matching_metrics / total_metrics


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="CodeAct CardCheck: Verify model cards against code"
    )
    parser.add_argument("model_card", help="Path to model card file")
    parser.add_argument("--repo-url", help="Git repository URL to clone")
    parser.add_argument("--repo-path", help="Local repository path")
    parser.add_argument("--output-dir", help="Output directory for reports")
    parser.add_argument("--runtime", action="store_true", help="Enable dynamic metric checks")
    parser.add_argument("--workdir", help="Working directory")
    parser.add_argument("--sg-binary", default="sg", help="Path to ast-grep binary")

    args = parser.parse_args()

    if not args.repo_url and not args.repo_path:
        parser.error("Either --repo-url or --repo-path must be provided")

    agent = CardCheckAgent(
        workdir=args.workdir,
        runtime_enabled=args.runtime,
        sg_binary=args.sg_binary,
    )

    report = agent.verify(
        model_card_path=args.model_card,
        repo_url=args.repo_url,
        repo_path=args.repo_path,
        output_dir=args.output_dir,
    )

    print("\n" + "=" * 60)
    print("Verification complete!")
    print(f"Consistency score: {report.get('consistency_score', 0):.1%}")
    print("=" * 60)


if __name__ == "__main__":
    main()

