"""
Security utilities: token creation, token decoding, and FastAPI
dependency-injection guards for role-based access control.

WHY: Centralising all auth logic here means every router enforces
the same rules, reducing the risk of unguarded endpoints creeping in.

At this stub stage:
  - Tokens are short-lived JWT signed with HS256.
  - The only real user is the bootstrap SUPERADMIN (from env config).
  - Tenant-scoped users are a placeholder for future implementation.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.hash import bcrypt

from app.core.config import settings

# ------------------------------------------------------------------
# Bearer token extractor (Authorization: Bearer <token>)
# ------------------------------------------------------------------
_bearer = HTTPBearer()


# ------------------------------------------------------------------
# Token utilities
# ------------------------------------------------------------------

def create_access_token(
    subject: str,
    role: str,
    tenant_id: Optional[str] = None,
) -> str:
    """
    Mint a signed JWT.

    Payload claims:
      sub       – username / actor identifier
      role      – "SUPERADMIN" or "USER"
      tenant_id – None for SUPERADMIN; UUID string for tenant users
      exp       – expiry timestamp
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {
        "sub": subject,
        "role": role,
        "tenant_id": tenant_id,
        "exp": expire,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT.  Raises HTTPException on any failure so
    callers never receive a partially-decoded payload.
    """
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Constant-time bcrypt password verification.

    WHY bcrypt: it is the industry-standard adaptive hash for passwords,
    deliberately slow to thwart brute-force attacks.
    """
    # Guard: reject the placeholder hash that signals an unconfigured env
    if hashed_password == "REPLACE_WITH_BCRYPT_HASH":
        return False
    return bcrypt.verify(plain_password, hashed_password)


# ------------------------------------------------------------------
# FastAPI dependency: authenticated principal
# ------------------------------------------------------------------

def get_current_principal(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """
    Dependency that extracts and validates the Bearer token.
    Returns the decoded JWT payload dict.
    """
    return decode_access_token(credentials.credentials)


# ------------------------------------------------------------------
# FastAPI dependency: SUPERADMIN guard
# WHY separate guard: explicitly prevents tenant endpoints from being
# accidentally called by a SUPERADMIN (and vice-versa).
# ------------------------------------------------------------------

def require_superadmin(
    principal: dict = Depends(get_current_principal),
) -> dict:
    """Raises 403 if the caller is not a SUPERADMIN."""
    if principal.get("role") != "SUPERADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SUPERADMIN role required.",
        )
    return principal


# ------------------------------------------------------------------
# FastAPI dependency: tenant-scoped USER guard
# ------------------------------------------------------------------

def require_tenant_user(
    principal: dict = Depends(get_current_principal),
) -> dict:
    """
    Raises 403 if the caller is not a tenant-scoped USER.
    Also ensures tenant_id is present in the token (no null-tenant access).
    """
    if principal.get("role") != "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant USER role required.",
        )
    if not principal.get("tenant_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenant context found in token.",
        )
    return principal
