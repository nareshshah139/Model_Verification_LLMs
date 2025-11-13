"""Python execution tool for metrics recomputation."""

import subprocess
import sys
from pathlib import Path
from typing import Dict, Any, Optional
import tempfile


class PyExecTool:
    """Tool for executing Python snippets for metrics recomputation."""

    def __init__(self, workdir: Optional[str] = None):
        """Initialize with optional working directory."""
        self.workdir = Path(workdir) if workdir else Path.cwd()

    def execute(
        self,
        code: str,
        context: Optional[Dict[str, Any]] = None,
        timeout: int = 300,
    ) -> Dict[str, Any]:
        """
        Execute Python code snippet and return results.

        Args:
            code: Python code to execute
            context: Optional context variables to inject
            timeout: Execution timeout in seconds

        Returns:
            Dictionary with execution results
        """
        # Create temporary script
        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".py",
            delete=False,
            dir=self.workdir,
        ) as f:
            # Inject context if provided
            if context:
                context_code = "\n".join(
                    f"{k} = {repr(v)}" for k, v in context.items()
                )
                script_content = f"{context_code}\n\n{code}"
            else:
                script_content = code

            f.write(script_content)
            script_path = Path(f.name)

        try:
            # Execute script
            result = subprocess.run(
                [sys.executable, str(script_path)],
                cwd=self.workdir,
                capture_output=True,
                text=True,
                timeout=timeout,
            )

            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode,
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Execution timeout",
                "stdout": "",
                "stderr": "",
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "stdout": "",
                "stderr": "",
            }
        finally:
            # Clean up
            if script_path.exists():
                script_path.unlink()

