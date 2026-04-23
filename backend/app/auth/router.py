"""
Authentication router.

POST /auth/login – stub implementation for the bootstrap SUPERADMIN.

WHY stub: at the scaffold stage the goal is to establish the correct
architectural boundaries (role separation, audit trail, no tenant leakage)
rather than a full identity provider integration.  The stub is intentionally
simple and clearly labelled so reviewers know it is not production-grade.

The only credential that works at this stage is the bootstrap SUPERADMIN
defined via environment variables.  Tenant user login is intentionally
left as a placeholder (returns 501 Not Implemented) so the boundary is
visible and explicit.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.audit.logger import log_action
from app.auth.models import LoginRequest, LoginResponse, UserRole
from app.core.config import settings
from app.core.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Obtain a Bearer token (stub)",
)
def login(payload: LoginRequest) -> LoginResponse:
    """
    Authenticate a user and return a JWT Bearer token.

    Current behaviour (stub stage):
      - Only the bootstrap SUPERADMIN account is recognised.
      - Tenant user authentication is NOT yet implemented.

    Security notes:
      - Credentials come exclusively from environment variables.
      - Passwords are never stored or logged.
      - The response deliberately includes the role so clients do not
        need to decode the JWT (which they should treat as opaque anyway).
    """
    # ------------------------------------------------------------------
    # SUPERADMIN authentication path
    # ------------------------------------------------------------------
    if payload.username == settings.superadmin_username:
        if not verify_password(payload.password, settings.superadmin_password_hash):
            # Use the same generic error for wrong username OR wrong password
            # to prevent username enumeration.
            _raise_invalid_credentials()

        token = create_access_token(
            subject=payload.username,
            role=UserRole.SUPERADMIN,
            tenant_id=None,  # SUPERADMIN is never associated with a tenant
        )

        log_action(
            actor=payload.username,
            role=UserRole.SUPERADMIN,
            action="LOGIN",
            tenant_id=None,
            details={"method": "password"},
        )

        return LoginResponse(
            access_token=token,
            role=UserRole.SUPERADMIN,
            tenant_id=None,
        )

    # ------------------------------------------------------------------
    # Tenant USER authentication path – placeholder
    # WHY 501 and not 404: the endpoint exists but the feature is not
    # yet implemented.  This is explicit rather than silently failing.
    # ------------------------------------------------------------------
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=(
            "Tenant user authentication is not yet implemented. "
            "Only the bootstrap SUPERADMIN account is active at this stage."
        ),
    )


def _raise_invalid_credentials() -> None:
    """Raise a uniform 401 to avoid leaking whether username or password was wrong."""
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid username or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )
