"""Structured JSON logging (spec 12.1).

Never logged: full prompt text, full generated script bodies, full knowledge
document content, API keys, provider payloads.
Logged instead: content hashes, character and token counts, retrieved chunk IDs
and scores, phase timings, and outcome.

Every line carries the correlation ID minted in Node, so one creator action
reads as one story across both services.
"""

import hashlib
import json
import logging
import sys
from datetime import datetime, timezone

_STANDARD = set(logging.LogRecord("", 0, "", 0, "", None, None).__dict__) | {
    "message", "asctime", "taskName"
}


def digest(text: str) -> dict:
    """Log the shape of sensitive text, never the text itself."""
    return {
        "chars": len(text),
        "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest()[:16],
    }


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname.lower(),
            "event": record.getMessage(),
            "service": "ai",
        }
        # Anything passed via extra=... rides along.
        payload.update(
            {k: v for k, v in record.__dict__.items() if k not in _STANDARD}
        )
        if record.exc_info:
            # Type only. The traceback goes nowhere near a log sink shared with
            # prompt and script data.
            payload["exception"] = record.exc_info[0].__name__
        return json.dumps(payload, default=str)


def configure_logging(level: int = logging.INFO) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)
