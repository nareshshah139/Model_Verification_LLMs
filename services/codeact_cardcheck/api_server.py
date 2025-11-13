"""FastAPI service wrapper for CodeAct CardCheck agent."""

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import tempfile
import shutil
from pathlib import Path
import json
import asyncio
import threading
import queue
import os

from agent_main import CardCheckAgent
from tools import AstGrepTool

app = FastAPI(title="CodeAct CardCheck API")


class VerifyRequest(BaseModel):
    """Request model for verification."""
    model_card_text: str
    repo_url: Optional[str] = None
    repo_path: Optional[str] = None
    runtime_enabled: bool = False
    sg_binary: str = "sg"
    llm_provider: str = "openai"  # openai, anthropic, etc.


class VerifyResponse(BaseModel):
    """Response model for verification."""
    success: bool
    report: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class AstGrepScanRequest(BaseModel):
    """Request model for ast-grep scan."""
    rulepack: str  # Path to rulepack file (relative to rules directory or absolute)
    paths: Optional[List[str]] = None  # Paths to scan (defaults to repo root)
    repo_path: Optional[str] = None  # Repository path (required if paths not absolute)
    json_output: bool = True


class AstGrepRunRequest(BaseModel):
    """Request model for ad-hoc ast-grep pattern."""
    pattern: str  # Pattern to search for
    lang: str = "python"  # Language
    paths: Optional[List[str]] = None  # Paths to scan
    repo_path: Optional[str] = None  # Repository path (required if paths not absolute)
    json_output: bool = True


class AstGrepResponse(BaseModel):
    """Response model for ast-grep operations."""
    success: bool
    matches: List[Dict[str, Any]] = []
    error: Optional[str] = None


@app.post("/verify", response_model=VerifyResponse)
async def verify(verify_request: VerifyRequest, request: Request) -> VerifyResponse:
    """
    Verify a model card against a codebase.

    Args:
        verify_request: Verification request with model card and repo info
        request: FastAPI request object (for headers)

    Returns:
        Verification report or error
    """
    try:
        # Get API key from headers if provided
        api_key = request.headers.get("X-API-Key")
        llm_provider = request.headers.get("X-LLM-Provider") or verify_request.llm_provider
        
        # Set API key in environment for this request
        if api_key:
            if llm_provider == "openai":
                os.environ["OPENAI_API_KEY"] = api_key
            elif llm_provider == "anthropic":
                os.environ["ANTHROPIC_API_KEY"] = api_key
        
        # Create temporary directory for work
        with tempfile.TemporaryDirectory() as tmpdir:
            # Write model card to temp file
            card_path = Path(tmpdir) / "model_card.md"
            card_path.write_text(verify_request.model_card_text, encoding="utf-8")

            # Initialize agent
            agent = CardCheckAgent(
                workdir=tmpdir,
                runtime_enabled=verify_request.runtime_enabled,
                sg_binary=verify_request.sg_binary,
                llm_provider=llm_provider,
            )

            # Run verification
            if not verify_request.repo_url and not verify_request.repo_path:
                raise ValueError("Either repo_url or repo_path must be provided")

            report = agent.verify(
                model_card_path=str(card_path),
                repo_url=verify_request.repo_url,
                repo_path=verify_request.repo_path,
                output_dir=str(Path(tmpdir) / "reports"),
            )

            return VerifyResponse(success=True, report=report)

    except Exception as e:
        return VerifyResponse(success=False, error=str(e))


@app.post("/verify/stream")
async def verify_stream(verify_request: VerifyRequest, request: Request):
    """
    Verify a model card against a codebase with SSE streaming.

    Args:
        verify_request: Verification request with model card and repo info
        request: FastAPI request object (for headers)

    Returns:
        SSE stream with progress updates and final report
    """
    # Get API key from headers if provided
    api_key = request.headers.get("X-API-Key")
    llm_provider = request.headers.get("X-LLM-Provider") or verify_request.llm_provider
    
    # Set API key in environment for this request
    if api_key:
        if llm_provider == "openai":
            os.environ["OPENAI_API_KEY"] = api_key
        elif llm_provider == "anthropic":
            os.environ["ANTHROPIC_API_KEY"] = api_key
    
    async def generate():
        """Generator function for SSE streaming."""
        try:
            # Create temporary directory for work
            with tempfile.TemporaryDirectory() as tmpdir:
                # Write model card to temp file
                card_path = Path(tmpdir) / "model_card.md"
                card_path.write_text(verify_request.model_card_text, encoding="utf-8")

                # Initialize agent
                agent = CardCheckAgent(
                    workdir=tmpdir,
                    runtime_enabled=verify_request.runtime_enabled,
                    sg_binary=verify_request.sg_binary,
                    llm_provider=llm_provider,
                )

                # Run verification with progress callback
                if not verify_request.repo_url and not verify_request.repo_path:
                    yield f"data: {json.dumps({'type': 'error', 'message': 'Either repo_url or repo_path must be provided'})}\n\n"
                    return

                # Shared state for progress updates
                progress_queue = queue.Queue()
                report_result = {'report': None, 'error': None, 'done': False}

                def progress_callback(message: str, data: Dict[str, Any]):
                    """Callback to queue progress updates."""
                    try:
                        progress_queue.put({
                            'type': 'progress',
                            'message': message,
                            'data': data
                        }, block=False)
                    except:
                        pass  # Queue full, skip

                def run_verification():
                    try:
                        report = agent.verify(
                            model_card_path=str(card_path),
                            repo_url=verify_request.repo_url,
                            repo_path=verify_request.repo_path,
                            output_dir=str(Path(tmpdir) / "reports"),
                            progress_callback=progress_callback,
                        )
                        report_result['report'] = report
                        report_result['done'] = True
                        progress_queue.put({'type': 'done'}, block=False)
                    except Exception as e:
                        report_result['error'] = str(e)
                        report_result['done'] = True
                        progress_queue.put({'type': 'error', 'message': str(e)}, block=False)

                verification_thread = threading.Thread(target=run_verification, daemon=True)
                verification_thread.start()

                # Stream progress updates
                while True:
                    try:
                        # Poll for progress updates
                        try:
                            update = progress_queue.get(timeout=0.1)
                            
                            if update['type'] == 'done':
                                # Send final report
                                yield f"data: {json.dumps({'type': 'complete', 'report': report_result['report']})}\n\n"
                                break
                            elif update['type'] == 'error':
                                yield f"data: {json.dumps({'type': 'error', 'message': update.get('message', 'Unknown error')})}\n\n"
                                break
                            else:
                                # Send progress update
                                yield f"data: {json.dumps(update)}\n\n"
                        except queue.Empty:
                            # Check if thread is done
                            if report_result['done']:
                                if report_result['error']:
                                    yield f"data: {json.dumps({'type': 'error', 'message': report_result['error']})}\n\n"
                                elif report_result['report']:
                                    yield f"data: {json.dumps({'type': 'complete', 'report': report_result['report']})}\n\n"
                                break
                            # Yield a keep-alive ping
                            yield f": keep-alive\n\n"
                            await asyncio.sleep(0.1)
                    except Exception as e:
                        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
                        break

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.post("/astgrep/scan", response_model=AstGrepResponse)
async def astgrep_scan(request: AstGrepScanRequest) -> AstGrepResponse:
    """
    Run ast-grep scan with a rulepack.
    
    This endpoint allows LLMs to call ast-grep as a tool.
    
    Args:
        request: Scan request with rulepack and paths
        
    Returns:
        List of matches found by ast-grep
    """
    try:
        # Determine workdir and rulepack path
        workdir = Path(request.repo_path) if request.repo_path else Path.cwd()
        rules_dir = Path(__file__).parent / "rules"
        
        # Resolve rulepack path
        rulepack_path = Path(request.rulepack)
        if not rulepack_path.is_absolute():
            # Try relative to rules directory first
            rulepack_path = rules_dir / request.rulepack
            if not rulepack_path.exists():
                # Try relative to workdir
                rulepack_path = workdir / request.rulepack
        
        if not rulepack_path.exists():
            return AstGrepResponse(
                success=False,
                error=f"Rulepack not found: {request.rulepack}"
            )
        
        # Initialize ast-grep tool
        astgrep_tool = AstGrepTool(str(workdir))
        
        # Determine scan paths
        scan_paths = request.paths if request.paths else ["."]
        
        # Run scan
        matches = astgrep_tool.scan(
            str(rulepack_path),
            paths=scan_paths,
            json_output=request.json_output,
        )
        
        return AstGrepResponse(success=True, matches=matches)
        
    except Exception as e:
        return AstGrepResponse(success=False, error=str(e))


@app.post("/astgrep/run", response_model=AstGrepResponse)
async def astgrep_run(request: AstGrepRunRequest) -> AstGrepResponse:
    """
    Run ad-hoc ast-grep pattern search.
    
    This endpoint allows LLMs to call ast-grep with custom patterns.
    
    Args:
        request: Pattern search request
        
    Returns:
        List of matches found by ast-grep
    """
    try:
        # Determine workdir
        workdir = Path(request.repo_path) if request.repo_path else Path.cwd()
        
        # Initialize ast-grep tool
        astgrep_tool = AstGrepTool(str(workdir))
        
        # Determine scan paths
        scan_paths = request.paths if request.paths else ["."]
        
        # Run pattern search
        matches = astgrep_tool.run(
            pattern=request.pattern,
            lang=request.lang,
            paths=scan_paths,
            json_output=request.json_output,
        )
        
        return AstGrepResponse(success=True, matches=matches)
        
    except Exception as e:
        return AstGrepResponse(success=False, error=str(e))


@app.get("/astgrep/rulepacks")
async def list_rulepacks() -> Dict[str, Any]:
    """
    List available rulepack files.
    
    Returns:
        List of available rulepack names
    """
    rules_dir = Path(__file__).parent / "rules"
    rulepacks = []
    
    if rules_dir.exists():
        for rulepack_file in rules_dir.glob("*.yaml"):
            rulepacks.append(rulepack_file.name)
    
    return {"rulepacks": rulepacks}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

