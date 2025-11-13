"""Markdown reporter for human-readable verification results."""

from pathlib import Path
from typing import Dict, Any, List


class MarkdownReporter:
    """Reporter that outputs verification results as Markdown."""

    def __init__(self, output_path: str):
        """
        Initialize Markdown reporter.

        Args:
            output_path: Path to output Markdown file
        """
        self.output_path = Path(output_path)

    def emit(self, report: Dict[str, Any]) -> None:
        """
        Emit verification report as Markdown.

        Args:
            report: Verification report dictionary (from JSONReporter.create_report)
        """
        self.output_path.parent.mkdir(parents=True, exist_ok=True)

        md_lines = [
            "# Model Card Verification Report",
            "",
            f"**Model ID:** {report.get('model_id', 'N/A')}",
            "",
        ]

        # Consistency score
        if report.get("consistency_score") is not None:
            score = report["consistency_score"]
            md_lines.extend(
                [
                    f"**Overall Consistency Score:** {score:.1%}",
                    "",
                ]
            )

        # Findings
        md_lines.extend(["## Findings", ""])

        findings = report.get("findings", [])
        for finding in findings:
            status = finding.get("status", "unknown")
            claim = finding.get("claim", "Unknown claim")
            impact = finding.get("impact", "unknown")

            # Status badge
            status_badges = {
                "confirmed": "✅ Confirmed",
                "contradicted": "❌ Contradicted",
                "not_found": "⚠️ Not Found",
                "non_verifiable": "ℹ️ Non-verifiable",
            }
            status_badge = status_badges.get(status, status)

            md_lines.extend(
                [
                    f"### {status_badge}: {claim}",
                    "",
                    f"**Impact:** {impact.upper()}",
                    "",
                ]
            )

            # Evidence
            evidence = finding.get("evidence", [])
            if evidence:
                md_lines.append("**Evidence:**")
                md_lines.append("")
                for ev in evidence[:5]:  # Limit to 5 examples
                    file_path = ev.get("file", "unknown")
                    line_num = ev.get("line")
                    content = ev.get("content", "")[:100]

                    if line_num:
                        md_lines.append(f"- `{file_path}:{line_num}`")
                    else:
                        md_lines.append(f"- `{file_path}`")

                    if content:
                        md_lines.append(f"  ```python\n  {content}\n  ```")
                    md_lines.append("")

            # Remediation
            remediation = finding.get("remediation")
            if remediation:
                md_lines.extend(
                    [
                        "**Suggested Remediation:**",
                        "",
                        f"> {remediation}",
                        "",
                    ]
                )

            md_lines.append("---")
            md_lines.append("")

        # Metrics differences
        metrics_diffs = report.get("metrics_diffs", {})
        if metrics_diffs:
            md_lines.extend(["## Metrics Differences", ""])
            for metric, diff in metrics_diffs.items():
                md_lines.extend(
                    [
                        f"### {metric}",
                        f"- **Claimed:** {diff.get('claimed', 'N/A')}",
                        f"- **Observed:** {diff.get('observed', 'N/A')}",
                        f"- **Difference:** {diff.get('difference', 'N/A')}",
                        "",
                    ]
                )

        # Summary table
        md_lines.extend(["## Summary", ""])
        md_lines.append("| Status | Count |")
        md_lines.append("|--------|-------|")

        status_counts = {}
        for finding in findings:
            status = finding.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1

        for status, count in status_counts.items():
            md_lines.append(f"| {status} | {count} |")

        md_lines.append("")

        # Write file
        with open(self.output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(md_lines))

