"""Formatter tool for normalizing Python code."""

import subprocess
from pathlib import Path
from typing import List, Optional


class FormatterTool:
    """Tool for formatting Python code to normalize AST matches."""

    def __init__(self, workdir: Optional[str] = None):
        """Initialize with optional working directory."""
        self.workdir = Path(workdir) if workdir else Path.cwd()

    def format(self, paths: List[str]) -> None:
        """
        Format Python files using black and ruff.

        Args:
            paths: List of Python file paths to format
        """
        for path in paths:
            path_obj = Path(path)
            if not path_obj.is_absolute():
                path_obj = self.workdir / path_obj

            if not path_obj.exists():
                continue

            # Format with black
            try:
                subprocess.run(
                    ["black", "--quiet", str(path_obj)],
                    check=False,
                    capture_output=True,
                )
            except FileNotFoundError:
                pass  # black not installed

            # Format with ruff
            try:
                subprocess.run(
                    ["ruff", "format", str(path_obj)],
                    check=False,
                    capture_output=True,
                )
            except FileNotFoundError:
                pass  # ruff not installed

