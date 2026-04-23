"""
Authentication schemas and role definitions.

WHY keep models separate from router: Pydantic models are reusable
across the codebase (e.g. tests, other routers) without importing
FastAPI routing machinery.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class UserRole(str, Enum):
    """
    Global role enumeration.

    SUPERADMIN – exists in the Control Plane only; no tenant affiliation.
    USER       – scoped to exactly one tenant; cannot cross tenant boundary.
    """

    SUPERADMIN = "SUPERADMIN"
    USER = "USER"


class LoginRequest(BaseModel):
    """Credentials submitted by the client at login time."""

    username: str
    password: str


class LoginResponse(BaseModel):
    """
    Successful login response.

    access_token – opaque Bearer token the client presents on every request.
    token_type   – always "bearer" per RFC 6750.
    role         – role encoded in the token (avoids client-side decode).
    tenant_id    – None for SUPERADMIN; UUID string for tenant users.
    """

    access_token: str
    token_type: str = "bearer"
    role: UserRole
    tenant_id: Optional[str] = None
