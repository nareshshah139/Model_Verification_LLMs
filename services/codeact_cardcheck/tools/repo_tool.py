"""Repository tool for cloning and file operations."""

import os
import subprocess
import shutil
from pathlib import Path
from typing import List, Optional
import glob


class RepoTool:
    """Tool for Git repository operations and file system access."""

    def __init__(self, workdir: Optional[str] = None):
        """Initialize with optional working directory."""
        self.workdir = Path(workdir) if workdir else Path.cwd()

    def clone(self, url: str, dest: Optional[str] = None) -> str:
        """
        Clone a Git repository.

        Args:
            url: Git repository URL
            dest: Destination directory (defaults to repo name)

        Returns:
            Path to cloned repository
        """
        if dest:
            dest_path = self.workdir / dest
        else:
            # Extract repo name from URL
            repo_name = url.rstrip("/").split("/")[-1].replace(".git", "")
            dest_path = self.workdir / repo_name

        if dest_path.exists():
            shutil.rmtree(dest_path)
        
        # Ensure parent directory exists
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        result = subprocess.run(
            ["git", "clone", url, str(dest_path)],
            check=False,
            capture_output=True,
            text=True,
        )
        
        if result.returncode != 0:
            error_msg = result.stderr or result.stdout or "Unknown error"
            raise RuntimeError(f"Failed to clone repository: {error_msg}")
        
        return str(dest_path)

    def checkout(self, repo_path: str, ref: str) -> None:
        """
        Checkout a specific Git reference.

        Args:
            repo_path: Path to repository
            ref: Git reference (branch, tag, or commit)
        """
        repo_path_obj = Path(repo_path)
        subprocess.run(
            ["git", "checkout", ref],
            cwd=repo_path_obj,
            check=True,
            capture_output=True,
        )

    def glob(self, pattern: str, root: Optional[str] = None) -> List[str]:
        """
        Find files matching a glob pattern.

        Args:
            pattern: Glob pattern
            root: Root directory (defaults to workdir)

        Returns:
            List of matching file paths
        """
        root_path = Path(root) if root else self.workdir
        matches = glob.glob(str(root_path / pattern), recursive=True)
        return [str(Path(m).relative_to(root_path)) for m in matches]

    def read(self, path: str, root: Optional[str] = None) -> str:
        """
        Read a file.

        Args:
            path: File path (relative to root)
            root: Root directory (defaults to workdir)

        Returns:
            File contents as string
        """
        root_path = Path(root) if root else self.workdir
        file_path = root_path / path
        return file_path.read_text(encoding="utf-8")

    def write(self, path: str, content: bytes, root: Optional[str] = None) -> None:
        """
        Write bytes to a file.

        Args:
            path: File path (relative to root)
            content: File contents as bytes
            root: Root directory (defaults to workdir)
        """
        root_path = Path(root) if root else self.workdir
        file_path = root_path / path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(content)

