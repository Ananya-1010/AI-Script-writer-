"""Service-to-service auth.

The Node service authenticates here with a shared service token. A creator JWT
is never forwarded downstream and this service issues no credentials, holds no
session, and writes no application state (spec 9.5).
"""

import hmac

from fastapi import Header

from .config import settings
from .errors import ServiceError


async def require_service_token(authorization: str = Header(default="")) -> None:
    scheme, _, token = authorization.partition(" ")

    if scheme != "Bearer" or not token:
        raise ServiceError("AUTH_ERROR", "Missing service credentials.")

    # Constant-time compare: a timing side channel on this token would hand an
    # attacker the whole retrieval and generation surface.
    if not hmac.compare_digest(token, settings.ai_service_token):
        raise ServiceError("AUTH_ERROR", "Invalid service credentials.")
