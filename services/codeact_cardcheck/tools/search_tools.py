"""Search tools for CodeAct agent to find evidence in codebase."""

import subprocess
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import re


class CodeSearchTool:
    """Tool for searching code using various methods."""

    def __init__(self, repo_path: str, ast_grep_binary: str = "sg"):
        """
        Initialize code search tool.
        
        Args:
            repo_path: Path to repository
            ast_grep_binary: Path to ast-grep binary
        """
        self.repo_path = Path(repo_path)
        self.sg_binary = ast_grep_binary

    def text_search(
        self,
        query: str,
        file_pattern: str = "*.py",
        context_lines: int = 3,
        case_sensitive: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Search for text patterns in code files.
        
        Args:
            query: Text or regex to search for
            file_pattern: File glob pattern (e.g., "*.py", "*.ipynb")
            context_lines: Number of context lines to include
            case_sensitive: Whether search is case-sensitive
            
        Returns:
            List of match dictionaries
        """
        try:
            cmd = ["grep", "-r", "-n"]
            
            if not case_sensitive:
                cmd.append("-i")
            
            if context_lines > 0:
                cmd.extend(["-C", str(context_lines)])
            
            cmd.extend(["--include", file_pattern, query, str(self.repo_path)])
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=str(self.repo_path)
            )
            
            matches = []
            current_file = None
            current_match = None
            
            for line in result.stdout.split("\n"):
                if not line.strip():
                    continue
                
                # Parse grep output: file:line:content
                parts = line.split(":", 2)
                if len(parts) >= 3:
                    file_path = parts[0]
                    try:
                        line_num = int(parts[1])
                        content = parts[2]
                        
                        if current_file != file_path:
                            if current_match:
                                matches.append(current_match)
                            current_file = file_path
                            current_match = {
                                "file": file_path,
                                "line": line_num,
                                "content": content,
                                "context": [content],
                                "query": query
                            }
                        else:
                            if current_match:
                                current_match["context"].append(content)
                    except ValueError:
                        # Context line (marked with --)
                        if current_match and len(parts) >= 2:
                            current_match["context"].append(parts[1] if len(parts) == 2 else parts[2])
            
            if current_match:
                matches.append(current_match)
            
            return matches
            
        except Exception as e:
            print(f"Error in text_search: {e}")
            return []

    def ast_search(
        self,
        pattern: str,
        language: str = "python",
        paths: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for AST patterns using ast-grep.
        
        Args:
            pattern: AST pattern to search for
            language: Programming language
            paths: Specific paths to search (optional)
            
        Returns:
            List of match dictionaries
        """
        try:
            cmd = [
                self.sg_binary,
                "run",
                "-p", pattern,
                "-l", language,
                "--json"
            ]
            
            if paths:
                cmd.extend(paths)
            else:
                cmd.append(str(self.repo_path))
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=str(self.repo_path)
            )
            
            if result.returncode == 0 and result.stdout.strip():
                matches = json.loads(result.stdout)
                return matches if isinstance(matches, list) else []
            else:
                return []
                
        except Exception as e:
            print(f"Error in ast_search: {e}")
            return []

    def function_search(self, function_name: str) -> List[Dict[str, Any]]:
        """
        Search for function definitions or calls.
        
        Args:
            function_name: Function name to search for
            
        Returns:
            List of matches
        """
        # Search for function definitions
        def_pattern = f"def {function_name}"
        def_matches = self.text_search(def_pattern, file_pattern="*.py")
        
        # Search for function calls
        call_pattern = f"{function_name}("
        call_matches = self.text_search(call_pattern, file_pattern="*.py")
        
        return def_matches + call_matches

    def import_search(self, module_or_class: str) -> List[Dict[str, Any]]:
        """
        Search for imports of a specific module or class.
        
        Args:
            module_or_class: Module or class name
            
        Returns:
            List of import statements
        """
        # Search for different import styles
        patterns = [
            f"import {module_or_class}",
            f"from .* import .*{module_or_class}",
            f"from {module_or_class} import"
        ]
        
        matches = []
        for pattern in patterns:
            matches.extend(self.text_search(pattern, file_pattern="*.py"))
        
        return matches

    def semantic_search(
        self,
        description: str,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Semantic search for code matching a description.
        
        Args:
            description: Natural language description
            top_k: Number of top results to return
            
        Returns:
            List of semantically matching code segments
        """
        # For now, use keyword-based search
        # In production, you could use embeddings/vector search
        keywords = self._extract_keywords(description)
        
        all_matches = []
        for keyword in keywords:
            matches = self.text_search(keyword, file_pattern="*.py", case_sensitive=False)
            all_matches.extend(matches)
        
        # Deduplicate and rank by relevance
        unique_matches = {}
        for match in all_matches:
            key = f"{match['file']}:{match['line']}"
            if key not in unique_matches:
                unique_matches[key] = match
                match["relevance_score"] = 1
            else:
                unique_matches[key]["relevance_score"] += 1
        
        # Sort by relevance and return top_k
        sorted_matches = sorted(
            unique_matches.values(),
            key=lambda x: x.get("relevance_score", 0),
            reverse=True
        )
        
        return sorted_matches[:top_k]

    def _extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from natural language text."""
        # Simple keyword extraction
        stopwords = {"the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to", "for", "of", "with", "by"}
        
        # Split and clean
        words = re.findall(r'\w+', text.lower())
        keywords = [w for w in words if w not in stopwords and len(w) > 3]
        
        return keywords


class NotebookSearchTool:
    """Tool for searching in Jupyter notebooks."""

    def __init__(self, repo_path: str):
        """
        Initialize notebook search tool.
        
        Args:
            repo_path: Path to repository
        """
        self.repo_path = Path(repo_path)

    def search_outputs(
        self,
        query: str,
        case_sensitive: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Search notebook output cells for text/values.
        
        Args:
            query: Text or regex to search for
            case_sensitive: Whether search is case-sensitive
            
        Returns:
            List of matches in notebook outputs
        """
        try:
            import nbformat
        except ImportError:
            print("nbformat not installed")
            return []
        
        matches = []
        notebook_files = list(self.repo_path.rglob("*.ipynb"))
        
        for nb_path in notebook_files:
            try:
                nb = nbformat.read(str(nb_path), as_version=4)
                
                for cell_idx, cell in enumerate(nb.cells):
                    if cell.cell_type != "code" or not cell.outputs:
                        continue
                    
                    for output_idx, output in enumerate(cell.outputs):
                        text = self._extract_output_text(output)
                        
                        if not text:
                            continue
                        
                        # Search in output text
                        if case_sensitive:
                            found = query in text
                        else:
                            found = query.lower() in text.lower()
                        
                        if found:
                            matches.append({
                                "file": str(nb_path.relative_to(self.repo_path)),
                                "cell": cell_idx,
                                "output": output_idx,
                                "content": text[:500],  # Truncate for readability
                                "query": query,
                                "cell_source": cell.source[:200] if hasattr(cell, 'source') else ""
                            })
            
            except Exception as e:
                print(f"Error reading notebook {nb_path}: {e}")
                continue
        
        return matches

    def search_code_cells(
        self,
        query: str,
        case_sensitive: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Search notebook code cells for patterns.
        
        Args:
            query: Text or regex to search for
            case_sensitive: Whether search is case-sensitive
            
        Returns:
            List of matches in code cells
        """
        try:
            import nbformat
        except ImportError:
            print("nbformat not installed")
            return []
        
        matches = []
        notebook_files = list(self.repo_path.rglob("*.ipynb"))
        
        for nb_path in notebook_files:
            try:
                nb = nbformat.read(str(nb_path), as_version=4)
                
                for cell_idx, cell in enumerate(nb.cells):
                    if cell.cell_type != "code":
                        continue
                    
                    source = cell.source if isinstance(cell.source, str) else "".join(cell.source)
                    
                    # Search in cell source
                    if case_sensitive:
                        found = query in source
                    else:
                        found = query.lower() in source.lower()
                    
                    if found:
                        matches.append({
                            "file": str(nb_path.relative_to(self.repo_path)),
                            "cell": cell_idx,
                            "content": source,
                            "query": query
                        })
            
            except Exception as e:
                print(f"Error reading notebook {nb_path}: {e}")
                continue
        
        return matches

    def _extract_output_text(self, output: Any) -> str:
        """Extract text from notebook output cell."""
        text = ""
        
        if output.output_type == "stream":
            text = output.text if isinstance(output.text, str) else "".join(output.text)
        elif output.output_type == "execute_result":
            data = output.get("data", {})
            if "text/plain" in data:
                text = data["text/plain"]
        elif output.output_type == "display_data":
            data = output.get("data", {})
            if "text/plain" in data:
                text = data["text/plain"]
        
        return text


class ArtifactSearchTool:
    """Tool for checking artifacts (saved models, data files, etc.)."""

    def __init__(self, repo_path: str):
        """
        Initialize artifact search tool.
        
        Args:
            repo_path: Path to repository
        """
        self.repo_path = Path(repo_path)

    def find_artifacts(self, pattern: str) -> List[Dict[str, Any]]:
        """
        Find artifact files matching a pattern.
        
        Args:
            pattern: Glob pattern (e.g., "*.pkl", "*.joblib", "*.h5")
            
        Returns:
            List of found artifacts with metadata
        """
        matches = []
        
        for file_path in self.repo_path.rglob(pattern):
            if file_path.is_file():
                matches.append({
                    "file": str(file_path.relative_to(self.repo_path)),
                    "size": file_path.stat().st_size,
                    "extension": file_path.suffix,
                    "name": file_path.name
                })
        
        return matches

    def check_artifact_usage(self, artifact_name: str) -> List[Dict[str, Any]]:
        """
        Check where an artifact is saved or loaded in code.
        
        Args:
            artifact_name: Name of artifact file
            
        Returns:
            List of code locations that reference the artifact
        """
        search_tool = CodeSearchTool(str(self.repo_path))
        
        # Search for the artifact name in code
        matches = search_tool.text_search(artifact_name, file_pattern="*.py")
        notebook_matches = search_tool.text_search(artifact_name, file_pattern="*.ipynb")
        
        return matches + notebook_matches

