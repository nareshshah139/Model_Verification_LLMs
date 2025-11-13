"""ast-grep tool for structural code scanning."""

import subprocess
import json
import yaml
from pathlib import Path
from typing import List, Dict, Any, Optional, Union


class AstGrepTool:
    """Tool for running ast-grep scans with rulepacks."""

    def __init__(self, workdir: Optional[str] = None, sg_binary: str = "sg"):
        """
        Initialize with optional working directory and ast-grep binary path.

        Args:
            workdir: Working directory
            sg_binary: Path to ast-grep binary (default: "sg")
        """
        self.workdir = Path(workdir) if workdir else Path.cwd()
        self.sg_binary = sg_binary

    def scan(
        self,
        rulepack: Union[str, Path],
        paths: Optional[List[str]] = None,
        json_output: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Run ast-grep scan with a rulepack.

        Args:
            rulepack: Path to YAML rulepack file
            paths: List of paths to scan (defaults to current directory)
            json_output: Whether to return JSON output

        Returns:
            List of match results
        """
        rulepack_path = Path(rulepack)
        if not rulepack_path.is_absolute():
            rulepack_path = self.workdir / rulepack_path

        if not rulepack_path.exists():
            return []

        scan_paths = paths if paths else ["."]
        cmd = [self.sg_binary, "scan", "-r", str(rulepack_path)]

        if json_output:
            cmd.append("--json")

        cmd.extend(scan_paths)

        try:
            result = subprocess.run(
                cmd,
                cwd=self.workdir,
                capture_output=True,
                text=True,
                check=False,
            )

            if json_output and result.stdout:
                try:
                    return json.loads(result.stdout)
                except json.JSONDecodeError:
                    # Try parsing line-by-line JSON
                    matches = []
                    for line in result.stdout.strip().split("\n"):
                        if line.strip():
                            try:
                                matches.append(json.loads(line))
                            except json.JSONDecodeError:
                                pass
                    return matches
            else:
                # Parse text output
                return self._parse_text_output(result.stdout)

        except FileNotFoundError:
            # ast-grep not installed, return empty results
            return []

    def run(
        self,
        pattern: str,
        lang: str = "python",
        paths: Optional[List[str]] = None,
        json_output: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Run ad-hoc ast-grep pattern.

        Args:
            pattern: Pattern to search for
            lang: Language (default: "python")
            paths: List of paths to scan
            json_output: Whether to return JSON output

        Returns:
            List of match results
        """
        scan_paths = paths if paths else ["."]
        cmd = [self.sg_binary, "run", "-p", pattern, "-l", lang]

        if json_output:
            cmd.append("--json")

        cmd.extend(scan_paths)

        try:
            result = subprocess.run(
                cmd,
                cwd=self.workdir,
                capture_output=True,
                text=True,
                check=False,
            )

            if json_output and result.stdout:
                try:
                    return json.loads(result.stdout)
                except json.JSONDecodeError:
                    matches = []
                    for line in result.stdout.strip().split("\n"):
                        if line.strip():
                            try:
                                matches.append(json.loads(line))
                            except json.JSONDecodeError:
                                pass
                    return matches
            else:
                return self._parse_text_output(result.stdout)

        except FileNotFoundError:
            return []

    def _parse_text_output(self, text: str) -> List[Dict[str, Any]]:
        """Parse ast-grep text output into structured format."""
        matches = []
        lines = text.strip().split("\n")
        current_file = None

        for line in lines:
            if ":" in line:
                parts = line.split(":", 2)
                if len(parts) >= 2:
                    file_path = parts[0]
                    line_num = parts[1]
                    content = parts[2] if len(parts) > 2 else ""

                    matches.append(
                        {
                            "file": file_path,
                            "line": int(line_num) if line_num.isdigit() else None,
                            "content": content.strip(),
                        }
                    )

        return matches

