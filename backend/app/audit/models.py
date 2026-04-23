"""
Audit entry model.

WHY a dedicated model: every auditable action in the platform must
produce a structured, consistent record.  Defining it as a Pydantic
model ensures type safety and makes future storage migrations (e.g. to
a database table) straightforward.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from pydantic import BaseModel, Field


class AuditEntry(BaseModel):
    """
    Immutable record of a single auditable action.

    Fields align with compliance requirements (GDPR Art. 30 / ISO 27001
    Annex A.8.15 – Logging):
      timestamp  – when the action occurred (UTC, always explicit)
      actor      – who performed the action (username or system identifier)
      role       – SUPERADMIN or USER (explicit role at time of action)
      tenant_id  – which tenant is affected; None for Control Plane actions
      action     – machine-readable action label (e.g. CREATE_TENANT)
      details    – optional free-form context (never contains secrets)
    """

    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    actor: str
    role: str
    tenant_id: Optional[str] = None
    action: str
    details: Optional[Any] = None
