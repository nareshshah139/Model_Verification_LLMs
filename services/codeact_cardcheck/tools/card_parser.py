"""Model card parser to extract ClaimsSpec JSON."""

import re
import json
from pathlib import Path
from typing import Dict, Any, Optional
import markdown
from bs4 import BeautifulSoup

try:
    from docx import Document
except ImportError:
    Document = None


class CardParser:
    """Parser for model cards (Markdown/HTML/Docx) to ClaimsSpec JSON."""

    def __init__(self):
        """Initialize parser."""
        pass

    def parse(self, card_text: str, card_format: str = "auto") -> Dict[str, Any]:
        """
        Parse model card into ClaimsSpec JSON.

        Args:
            card_text: Model card text content
            card_format: Format hint ("markdown", "html", "docx", "auto")

        Returns:
            ClaimsSpec dictionary
        """
        # Detect format if auto
        if card_format == "auto":
            card_format = self._detect_format(card_text)

        # Extract text based on format
        if card_format == "markdown":
            text = self._extract_from_markdown(card_text)
        elif card_format == "html":
            text = self._extract_from_html(card_text)
        elif card_format == "docx":
            text = self._extract_from_docx(card_text)
        else:
            text = card_text

        # Parse claims from text
        return self._extract_claims(text)

    def _detect_format(self, text: str) -> str:
        """Detect card format."""
        if text.strip().startswith("<?xml") or "<html" in text.lower():
            return "html"
        elif text.strip().startswith("<?xml") and "word" in text.lower():
            return "docx"
        else:
            return "markdown"

    def _extract_from_markdown(self, text: str) -> str:
        """Extract plain text from Markdown."""
        html = markdown.markdown(text)
        soup = BeautifulSoup(html, "html.parser")
        return soup.get_text()

    def _extract_from_html(self, text: str) -> str:
        """Extract plain text from HTML."""
        soup = BeautifulSoup(text, "html.parser")
        return soup.get_text()

    def _extract_from_docx(self, text: str) -> str:
        """Extract plain text from DOCX."""
        if Document is None:
            return text

        # For now, assume text is already extracted
        # In production, you'd parse the DOCX file
        return text

    def _extract_claims(self, text: str) -> Dict[str, Any]:
        """
        Extract claims from model card text using regex patterns.

        This is a simplified extractor. In production, you'd use
        more sophisticated NLP or structured parsing.
        """
        claims: Dict[str, Any] = {
            "model_id": None,
            "family": {},
            "score_scale": {},
            "risk_classes": [],
            "splits": {},
            "features_policy": {},
            "bounds": {},
            "metrics": {},
        }

        text_lower = text.lower()

        # Extract model ID
        model_id_match = re.search(
            r"model\s+(?:id|identifier)[:\s]+([A-Z0-9\-]+)", text, re.IGNORECASE
        )
        if model_id_match:
            claims["model_id"] = model_id_match.group(1)

        # Extract PD model family
        if re.search(r"logistic\s+(?:regression|scorecard)", text_lower):
            claims["family"]["pd"] = "logistic_scorecard"
        elif re.search(r"lightgbm|lgbm", text_lower):
            claims["family"]["pd"] = "lightgbm"
        elif re.search(r"xgboost|xgb", text_lower):
            claims["family"]["pd"] = "xgboost"

        # Extract LGD model family
        if re.search(r"two[\s-]?stage|hurdle", text_lower):
            claims["family"]["lgd"] = "two_stage_hurdle"
        elif re.search(r"beta\s+regression", text_lower):
            claims["family"]["lgd"] = "beta_regression"
        elif re.search(r"linear\s+regression", text_lower):
            claims["family"]["lgd"] = "linear_regression"

        # Extract EAD model family
        if re.search(r"linear\s+regression.*ccf", text_lower):
            claims["family"]["ead"] = "linear_regression_on_ccf"
        elif re.search(r"beta\s+regression", text_lower):
            claims["family"]["ead"] = "beta_regression"

        # Extract score scale - look for "300-850" or "scale: 300-850" patterns
        scale_patterns = [
            r"scale[:\s]+(\d+)\s*[-–]\s*(\d+)",
            r"(\d{3})\s*[-–]\s*(\d{3})",  # Three-digit ranges like 300-850
        ]
        for pattern in scale_patterns:
            scale_match = re.search(pattern, text, re.IGNORECASE)
            if scale_match:
                min_val, max_val = int(scale_match.group(1)), int(scale_match.group(2))
                if 200 <= min_val <= 400 and 600 <= max_val <= 900:
                    claims["score_scale"] = {"min": min_val, "max": max_val}
                    break

        # Extract risk classes - look for list format
        risk_match = re.search(
            r"risk\s+classes?[:\s]+([A-Z,\s]+)", text, re.IGNORECASE
        )
        if risk_match:
            classes_str = risk_match.group(1)
            # Clean up and split
            classes = [c.strip() for c in classes_str.split(",") if c.strip()]
            # Filter out invalid entries
            classes = [c for c in classes if len(c) <= 3 and c.isalpha()]
            if classes:
                claims["risk_classes"] = classes

        # Extract splits
        train_match = re.search(r"train[ing]?[:\s]+(\d{4}[-–]\d{4})", text, re.IGNORECASE)
        if train_match:
            claims["splits"]["train"] = train_match.group(1)

        test_match = re.search(r"test[ing]?[:\s]+(\d{4})", text, re.IGNORECASE)
        if test_match:
            claims["splits"]["test"] = test_match.group(1)

        monitor_match = re.search(r"monitor[ing]?[:\s]+(\d{4})", text, re.IGNORECASE)
        if monitor_match:
            claims["splits"]["monitor"] = monitor_match.group(1)

        if re.search(r"out[\s-]?of[\s-]?time", text_lower) or "oot" in text_lower:
            claims["splits"]["strategy"] = "out_of_time"

        # Extract excluded columns - look for code blocks or lists
        exclude_patterns = [
            r"exclude[ds]?[:\s]+(?:columns?)?[:\s]*\n*(?:[-*]\s*)?`?([a-z_]+)`?",  # After "Excluded Columns:"
            r"`([a-z_]+)`.*(?:exclude|leakage)",  # In code blocks
        ]
        columns = []
        for pattern in exclude_patterns:
            exclude_matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
            for match in exclude_matches:
                col = match.group(1).strip()
                if col and col not in columns:
                    columns.append(col)
        
        # Also look for common leakage column names
        leakage_cols = ["out_prncp", "total_pymnt", "recoveries", "last_pymnt_d", "last_pymnt_amnt", "out_prncp_inv"]
        for col in leakage_cols:
            if col in text_lower and col not in columns:
                columns.append(col)
        
        if columns:
            claims["features_policy"]["exclude_columns"] = columns

        # Extract bounds
        bounds_match = re.search(r"\[(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)\]", text)
        if bounds_match:
            min_val, max_val = float(bounds_match.group(1)), float(bounds_match.group(2))
            if 0 <= min_val <= 1 and 0 <= max_val <= 1:
                claims["bounds"]["ccf"] = [min_val, max_val]
                claims["bounds"]["recovery_rate"] = [min_val, max_val]

        # Extract metrics (simplified)
        auc_match = re.search(r"auc[:\s]+([><=]?\s*\d+\.?\d*)", text, re.IGNORECASE)
        if auc_match:
            claims["metrics"]["pd"] = claims["metrics"].get("pd", {})
            claims["metrics"]["pd"]["auc_test"] = auc_match.group(1).strip()

        ks_match = re.search(r"ks[:\s]+([><=]?\s*\d+\.?\d*)", text, re.IGNORECASE)
        if ks_match:
            claims["metrics"]["pd"] = claims["metrics"].get("pd", {})
            claims["metrics"]["pd"]["ks"] = ks_match.group(1).strip()

        return claims

