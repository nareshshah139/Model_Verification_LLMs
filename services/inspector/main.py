from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any

from inspector.ts_bootstrap import parser  # noqa: F401


class AnalyzeRequest(BaseModel):
    files: List[Dict[str, Any]]


app = FastAPI()


@app.post("/analyze")
def analyze(req: AnalyzeRequest) -> Dict[str, Any]:
    # Placeholder: return empty facts structure
    return {"code_facts": {"metrics": [], "universe": [], "riskControls": []}}

