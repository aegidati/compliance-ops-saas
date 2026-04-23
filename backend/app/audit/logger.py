"""
Audit logger.

WHY structured logging to stdout: at the scaffold stage, stdout is the
universal, infrastructure-agnostic sink.  Cloud run-times (GCP Cloud Run,
Azure Container Apps, AWS ECS) capture stdout automatically and forward
it to log aggregators.  Switching to a database or SIEM later requires
only changing this module.

Output format: JSON-like single line per entry so it is parseable by
log management tools (Loki, Datadog, Splunk) without configuration.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from app.audit.models import AuditEntry

# Use Python's standard logger so the output honours the application's
# log level configuration and can be captured by testing frameworks.
_logger = logging.getLogger("audit")


def log_action(
    actor: str,
    role: str,
    action: str,
    tenant_id: Optional[str] = None,
    details: Optional[Any] = None,
) -> AuditEntry:
    """
    Record an auditable action and emit it to the audit log.

    Returns the AuditEntry so callers can inspect or store it if needed.

    WHY return the entry: allows callers (e.g. tests) to assert on the
    exact record that was produced without re-parsing log output.
    """
    entry = AuditEntry(
        actor=actor,
        role=role,
        tenant_id=tenant_id,
        action=action,
        details=details,
    )

    _logger.info(
        json.dumps(
            {
                "audit": True,
                "timestamp": entry.timestamp.isoformat(),
                "actor": entry.actor,
                "role": entry.role,
                "tenant_id": entry.tenant_id,
                "action": entry.action,
                "details": entry.details,
            }
        )
    )

    return entry
