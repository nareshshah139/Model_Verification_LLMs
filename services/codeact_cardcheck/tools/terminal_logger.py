"""Terminal-only logging utility with colored output and structured formatting."""

import sys
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum


class LogLevel(Enum):
    """Log levels for terminal output."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"
    SUCCESS = "SUCCESS"


class TerminalLogger:
    """Terminal logger with colored output and structured formatting."""
    
    # ANSI color codes
    COLORS = {
        "RESET": "\033[0m",
        "BOLD": "\033[1m",
        "DIM": "\033[2m",
        "RED": "\033[31m",
        "GREEN": "\033[32m",
        "YELLOW": "\033[33m",
        "BLUE": "\033[34m",
        "MAGENTA": "\033[35m",
        "CYAN": "\033[36m",
        "WHITE": "\033[37m",
    }
    
    # Level-specific colors
    LEVEL_COLORS = {
        LogLevel.DEBUG: COLORS["DIM"] + COLORS["WHITE"],
        LogLevel.INFO: COLORS["CYAN"],
        LogLevel.WARN: COLORS["YELLOW"],
        LogLevel.ERROR: COLORS["RED"],
        LogLevel.SUCCESS: COLORS["GREEN"],
    }
    
    def __init__(self, name: str = "CardCheck", show_timestamp: bool = True, min_level: LogLevel = LogLevel.INFO):
        """
        Initialize terminal logger.
        
        Args:
            name: Logger name/prefix
            show_timestamp: Whether to show timestamps
            min_level: Minimum log level to display
        """
        self.name = name
        self.show_timestamp = show_timestamp
        self.min_level = min_level
        self._level_order = {
            LogLevel.DEBUG: 0,
            LogLevel.INFO: 1,
            LogLevel.WARN: 2,
            LogLevel.ERROR: 3,
            LogLevel.SUCCESS: 1,  # Same priority as INFO
        }
    
    def _should_log(self, level: LogLevel) -> bool:
        """Check if message should be logged based on min_level."""
        return self._level_order.get(level, 1) >= self._level_order.get(self.min_level, 1)
    
    def _format_message(self, level: LogLevel, message: str, data: Optional[Dict[str, Any]] = None) -> str:
        """Format log message with colors and structure."""
        if not self._should_log(level):
            return ""
        
        # Get color for level
        color = self.LEVEL_COLORS.get(level, self.COLORS["RESET"])
        reset = self.COLORS["RESET"]
        
        # Build timestamp
        timestamp = ""
        if self.show_timestamp:
            timestamp = datetime.now().strftime("%H:%M:%S")
        
        # Build prefix
        prefix_parts = []
        if timestamp:
            prefix_parts.append(f"{self.COLORS['DIM']}{timestamp}{reset}")
        prefix_parts.append(f"{color}{self.COLORS['BOLD']}[{level.value}]{reset}")
        prefix_parts.append(f"{self.COLORS['DIM']}[{self.name}]{reset}")
        
        prefix = " ".join(prefix_parts)
        
        # Format message
        formatted = f"{prefix} {message}"
        
        # Add data if provided
        if data:
            data_str = ", ".join(f"{k}={v}" for k, v in data.items() if not k.startswith("_"))
            if data_str:
                formatted += f" {self.COLORS['DIM']}({data_str}){reset}"
        
        return formatted
    
    def debug(self, message: str, data: Optional[Dict[str, Any]] = None):
        """Log debug message."""
        formatted = self._format_message(LogLevel.DEBUG, message, data)
        if formatted:
            print(formatted, file=sys.stderr)
    
    def info(self, message: str, data: Optional[Dict[str, Any]] = None):
        """Log info message."""
        formatted = self._format_message(LogLevel.INFO, message, data)
        if formatted:
            print(formatted, file=sys.stderr)
    
    def warn(self, message: str, data: Optional[Dict[str, Any]] = None):
        """Log warning message."""
        formatted = self._format_message(LogLevel.WARN, message, data)
        if formatted:
            print(formatted, file=sys.stderr)
    
    def error(self, message: str, data: Optional[Dict[str, Any]] = None):
        """Log error message."""
        formatted = self._format_message(LogLevel.ERROR, message, data)
        if formatted:
            print(formatted, file=sys.stderr)
    
    def success(self, message: str, data: Optional[Dict[str, Any]] = None):
        """Log success message."""
        formatted = self._format_message(LogLevel.SUCCESS, message, data)
        if formatted:
            print(formatted, file=sys.stderr)
    
    def section(self, title: str, char: str = "=", width: int = 60):
        """Print a section header."""
        line = char * width
        print(f"\n{self.COLORS['BOLD']}{self.COLORS['CYAN']}{line}{self.COLORS['RESET']}", file=sys.stderr)
        print(f"{self.COLORS['BOLD']}{self.COLORS['CYAN']}{title.center(width)}{self.COLORS['RESET']}", file=sys.stderr)
        print(f"{self.COLORS['BOLD']}{self.COLORS['CYAN']}{line}{self.COLORS['RESET']}\n", file=sys.stderr)
    
    def progress(self, step: int, total: int, message: str, data: Optional[Dict[str, Any]] = None):
        """Log progress message with step indicator."""
        percent = int((step / total) * 100) if total > 0 else 0
        progress_msg = f"[{step}/{total}] ({percent}%) {message}"
        formatted = self._format_message(LogLevel.INFO, progress_msg, data)
        if formatted:
            print(formatted, file=sys.stderr)
    
    def divider(self, char: str = "-", width: int = 60):
        """Print a divider line."""
        print(f"{self.COLORS['DIM']}{char * width}{self.COLORS['RESET']}", file=sys.stderr)


# Global logger instance
_default_logger = TerminalLogger()


def get_logger(name: str = "CardCheck", show_timestamp: bool = True, min_level: LogLevel = LogLevel.INFO) -> TerminalLogger:
    """Get a logger instance."""
    return TerminalLogger(name=name, show_timestamp=show_timestamp, min_level=min_level)


# Convenience functions using default logger
def debug(message: str, data: Optional[Dict[str, Any]] = None):
    """Log debug message using default logger."""
    _default_logger.debug(message, data)


def info(message: str, data: Optional[Dict[str, Any]] = None):
    """Log info message using default logger."""
    _default_logger.info(message, data)


def warn(message: str, data: Optional[Dict[str, Any]] = None):
    """Log warning message using default logger."""
    _default_logger.warn(message, data)


def error(message: str, data: Optional[Dict[str, Any]] = None):
    """Log error message using default logger."""
    _default_logger.error(message, data)


def success(message: str, data: Optional[Dict[str, Any]] = None):
    """Log success message using default logger."""
    _default_logger.success(message, data)


def section(title: str, char: str = "=", width: int = 60):
    """Print section header using default logger."""
    _default_logger.section(title, char, width)


def progress(step: int, total: int, message: str, data: Optional[Dict[str, Any]] = None):
    """Log progress using default logger."""
    _default_logger.progress(step, total, message, data)

