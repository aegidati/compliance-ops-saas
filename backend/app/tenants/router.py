"""
Tenant management router (Control Plane).

All endpoints here are SUPERADMIN-only because tenant lifecycle management
is a Control Plane concern.  No tenant internal data is ever exposed here.

WHY SUPERADMIN-only: a regular tenant USER must never be able to create,
list, or suspend another tenant – that would break tenant isolation.
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from app.audit.logger import log_action
from app.core.security import require_superadmin
from app.tenants.models import (
    Tenant,
    TenantCreateRequest,
    TenantResponse,
    TenantStatus,
    get_tenant_store,
)

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.post(
    "",
    response_model=TenantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new tenant (SUPERADMIN only)",
    dependencies=[Depends(require_superadmin)],
)
def create_tenant(
    payload: TenantCreateRequest,
    principal: dict = Depends(require_superadmin),
) -> TenantResponse:
    """
    Register a new tenant in the Control Plane.

    - Only the SUPERADMIN may call this endpoint.
    - The new tenant starts in ACTIVE status.
    - The action is recorded in the audit log.
    - No tenant internal data is created here (that is a Tenant Plane concern).
    """
    store = get_tenant_store()

    # Guard against duplicate names (simple uniqueness check for stub stage)
    if any(t.name == payload.name for t in store.values()):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A tenant named '{payload.name}' already exists.",
        )

    tenant = Tenant(name=payload.name)
    store[tenant.tenant_id] = tenant

    log_action(
        actor=principal["sub"],
        role=principal["role"],
        action="CREATE_TENANT",
        tenant_id=tenant.tenant_id,
        details={"name": tenant.name},
    )

    return TenantResponse(
        tenant_id=tenant.tenant_id,
        name=tenant.name,
        status=tenant.status,
        created_at=tenant.created_at,
    )


@router.get(
    "",
    response_model=List[TenantResponse],
    summary="List all tenants (SUPERADMIN only)",
    dependencies=[Depends(require_superadmin)],
)
def list_tenants(
    principal: dict = Depends(require_superadmin),
) -> List[TenantResponse]:
    """
    Return all registered tenants.

    WHY include suspended tenants: the SUPERADMIN needs visibility of
    the full lifecycle for governance purposes.  Clients can filter by
    status if needed.
    """
    store = get_tenant_store()

    log_action(
        actor=principal["sub"],
        role=principal["role"],
        action="LIST_TENANTS",
        tenant_id=None,
        details={"count": len(store)},
    )

    return [
        TenantResponse(
            tenant_id=t.tenant_id,
            name=t.name,
            status=t.status,
            created_at=t.created_at,
        )
        for t in store.values()
    ]


@router.patch(
    "/{tenant_id}/suspend",
    response_model=TenantResponse,
    summary="Suspend a tenant (SUPERADMIN only)",
    dependencies=[Depends(require_superadmin)],
)
def suspend_tenant(
    tenant_id: str,
    principal: dict = Depends(require_superadmin),
) -> TenantResponse:
    """
    Set a tenant's status to SUSPENDED.

    WHY PATCH and not DELETE: suspension is a reversible lifecycle state.
    Hard deletion of tenants is a separate, more destructive operation
    that will require a dedicated ADR before implementation.
    """
    store = get_tenant_store()
    tenant = store.get(tenant_id)

    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant '{tenant_id}' not found.",
        )

    if tenant.status == TenantStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tenant '{tenant_id}' is already suspended.",
        )

    tenant.status = TenantStatus.SUSPENDED

    log_action(
        actor=principal["sub"],
        role=principal["role"],
        action="SUSPEND_TENANT",
        tenant_id=tenant_id,
        details={"name": tenant.name},
    )

    return TenantResponse(
        tenant_id=tenant.tenant_id,
        name=tenant.name,
        status=tenant.status,
        created_at=tenant.created_at,
    )
