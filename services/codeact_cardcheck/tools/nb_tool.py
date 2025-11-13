"""Notebook tool for converting and running Jupyter notebooks."""

import subprocess
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import tempfile
import shutil

try:
    from nbclient import NotebookClient
    from nbconvert import PythonExporter
    import nbformat
except ImportError:
    NotebookClient = None
    PythonExporter = None
    nbformat = None


class NotebookTool:
    """Tool for converting notebooks to Python and running them."""

    def __init__(self, workdir: Optional[str] = None):
        """Initialize with optional working directory."""
        self.workdir = Path(workdir) if workdir else Path.cwd()

    def convert_to_py(
        self, 
        paths: List[str], 
        output_dir: Optional[str] = None,
        progress_callback: Optional[callable] = None
    ) -> List[str]:
        """
        Convert Jupyter notebooks to Python scripts.

        Args:
            paths: List of notebook file paths
            output_dir: Output directory (defaults to same directory as notebooks)
            progress_callback: Optional callback(message: str) for progress updates

        Returns:
            List of generated Python file paths
        """
        def log(message: str):
            """Helper to log messages."""
            if progress_callback:
                progress_callback(message)
            else:
                print(message)
        
        if PythonExporter is None:
            raise ImportError("nbconvert is required for notebook conversion")

        exporter = PythonExporter()
        output_paths = []

        for idx, nb_path in enumerate(paths, 1):
            try:
                nb_path_obj = Path(nb_path)
                if not nb_path_obj.is_absolute():
                    nb_path_obj = self.workdir / nb_path_obj

                if not nb_path_obj.exists():
                    log(f"Warning: Notebook not found: {nb_path}")
                    continue

                log(f"Converting notebook {idx}/{len(paths)}: {nb_path_obj.name}")

                # Read notebook using nbformat
                if nbformat is None:
                    raise ImportError("nbformat is required for notebook conversion")
                nb_content = nbformat.read(str(nb_path_obj), as_version=4)

                # Convert to Python
                body, _ = exporter.from_notebook_node(nb_content)

                # Determine output path
                if output_dir:
                    output_dir_obj = Path(output_dir)
                    if not output_dir_obj.is_absolute():
                        output_dir_obj = self.workdir / output_dir_obj
                    output_dir_obj.mkdir(parents=True, exist_ok=True)
                    py_path = output_dir_obj / (nb_path_obj.stem + ".py")
                else:
                    py_path = nb_path_obj.parent / (nb_path_obj.stem + ".py")

                # Write Python file
                py_path.write_text(body, encoding="utf-8")
                
                # Try to get relative path, fallback to absolute if not within workdir
                try:
                    rel_path = str(py_path.relative_to(self.workdir))
                except ValueError:
                    # Path is not relative to workdir, use absolute
                    rel_path = str(py_path)
                    
                output_paths.append(rel_path)
                log(f"  ✓ Converted {nb_path_obj.name} to {py_path.name}")
                
            except Exception as e:
                log(f"Error converting {nb_path}: {e}")
                # Continue with other notebooks instead of failing completely
                continue

        log(f"Conversion complete: {len(output_paths)}/{len(paths)} notebooks converted successfully")
        return output_paths

    def run(self, notebook_path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Run a notebook headlessly and return outputs.

        Args:
            notebook_path: Path to notebook file
            params: Optional parameters to inject (for papermill-style execution)

        Returns:
            Dictionary with execution results and outputs
        """
        if NotebookClient is None:
            raise ImportError("nbclient is required for notebook execution")

        nb_path_obj = Path(notebook_path)
        if not nb_path_obj.is_absolute():
            nb_path_obj = self.workdir / nb_path_obj

        # Read notebook using nbformat
        if nbformat is None:
            raise ImportError("nbformat is required for notebook execution")
        nb_content = nbformat.read(str(nb_path_obj), as_version=4)

        # Inject parameters if provided
        if params:
            # Add parameters cell if not present
            params_cell = nbformat.v4.new_code_cell(
                source=[f"{k} = {repr(v)}\n" for k, v in params.items()],
                metadata={"tags": ["parameters"]}
            )
            nb_content.cells.insert(0, params_cell)

        # Execute notebook
        client = NotebookClient(nb_content, timeout=600, kernel_name="python3")
        try:
            client.execute()
        except Exception as e:
            return {"success": False, "error": str(e), "outputs": {}}

        # Extract outputs
        outputs = {}
        for cell in nb_content.cells:
            if cell.cell_type == "code" and cell.outputs:
                for output in cell.outputs:
                    if output.output_type == "execute_result":
                        data = output.get("data", {})
                        if "text/plain" in data:
                            source = cell.source
                            source_str = "".join(source) if isinstance(source, list) else str(source)
                            outputs[source_str[:50]] = data["text/plain"]

        return {"success": True, "outputs": outputs, "notebook": json.loads(nbformat.writes(nb_content))}

