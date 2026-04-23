"""
Tenant domain models.

WHY keep tenant models minimal at scaffold stage: the goal is to
establish the correct data shape and enforce tenant_id as a first-class
concept throughout the codebase, not to build a full persistence layer yet.

The in-memory store (_tenant_store) is explicitly a stub.  Comments mark
the replacement point for when a real database is introduced.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, Optional

from pydantic import BaseModel, Field


class TenantStatus(str, Enum):
    """
    Lifecycle states of a tenant.

    active    – tenant is operational and can have users / data.
    suspended – tenant is temporarily disabled (e.g. non-payment, audit hold).

    WHY explicit enum: guards against accidental string drift in the
    codebase and makes the lifecycle machine-readable for audit queries.
    """

    ACTIVE = "active"
    SUSPENDED = "suspended"


class Tenant(BaseModel):
    """
    Core tenant entity (Control Plane).

    tenant_id  – globally unique; generated at creation; never reused.
    name       – human-readable display name.
    status     – lifecycle state.
    created_at – immutable creation timestamp (UTC).
    """

    tenant_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    status: TenantStatus = TenantStatus.ACTIVE
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class TenantCreateRequest(BaseModel):
    """Payload accepted when creating a new tenant."""

    name: str


class TenantResponse(BaseModel):
    """Public representation of a tenant returned by the API."""

    tenant_id: str
    name: str
    status: TenantStatus
    created_at: datetime


# ------------------------------------------------------------------
# In-memory tenant store (stub)
#
# WHY in-memory at this stage: avoids a database dependency while the
# architectural boundaries are being validated.  Replace with a proper
# repository class (SQLAlchemy / SQLModel) when persistence is added.
#
# This dict is keyed by tenant_id for O(1) lookup.
# ------------------------------------------------------------------
_tenant_store: Dict[str, Tenant] = {}


def get_tenant_store() -> Dict[str, Tenant]:
    """
    Accessor for the in-memory store.

    WHY accessor instead of direct import: makes it trivial to swap in a
    database-backed store later without changing router code.
    """
    return _tenant_store


def find_tenant(tenant_id: str) -> Optional[Tenant]:
    """Return a tenant by ID or None if not found."""
    return _tenant_store.get(tenant_id)
