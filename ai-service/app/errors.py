"""The same typed error envelope the Node service uses (spec 6.9).

Error payloads never carry prompts, system instructions, stack traces or
provider responses. Prompt text is both a product asset and an injection
surface; it does not cross the service boundary (spec 9.4).
"""

from dataclasses import dataclass

ERROR_CODES: dict[str, tuple[int, bool]] = {
    # code: (http status, retryable)
    "VALIDATION_ERROR": (400, False),
    "AUTH_ERROR": (401, False),
    "NOT_FOUND": (404, False),
    "RETRIEVAL_FAILED": (500, True),
    "MALFORMED_LLM_OUTPUT": (500, True),
    "INGESTION_FAILED": (500, True),
    "LLM_TIMEOUT": (503, True),
    "LLM_RATE_LIMITED": (503, True),
    "GENERATION_FAILED": (503, True),
    "INTERNAL_ERROR": (500, False),
}


@dataclass
class ServiceError(Exception):
    code: str
    message: str

    @property
    def status(self) -> int:
        return ERROR_CODES.get(self.code, ERROR_CODES["INTERNAL_ERROR"])[0]

    @property
    def retryable(self) -> bool:
        return ERROR_CODES.get(self.code, ERROR_CODES["INTERNAL_ERROR"])[1]

    def envelope(self, request_id: str = "", correlation_id: str = "") -> dict:
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "requestId": request_id,
                "correlationId": correlation_id,
                "retryable": self.retryable,
            }
        }
