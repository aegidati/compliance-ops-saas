# ADR-001: Multitenancy Model and Isolation Strategy

## Status
Accepted

## Date
2026-04-23

## Context
The platform being developed is a **SaaS Compliance Operations Platform** supporting
regulated organizations (GDPR, ISO 27001, NIS2, 231).

The system must handle:
- multiple customer organizations (“tenants”)
- legally independent responsibilities per tenant
- strict separation of data, processes, and audit trails
- AI-assisted workflows without delegating regulatory responsibility

The platform is developed using an **Issue → Copilot → Pull Request** workflow.
Therefore, architectural decisions must be explicitly documented to avoid
implicit or accidental changes during automated code generation.

## Decision
The platform adopts a **strict multitenant architecture** with the following rules:

### Tenant Definition
- One **tenant equals one customer organization**.
- Each tenant represents an independent legal entity.
- No tenant shares compliance responsibility with another tenant.

### Tenant Isolation
- Tenant data MUST be isolated.
- Cross-tenant data access is strictly forbidden.
- Each request must always be evaluated within an explicit `tenant_id` context.
- The system MUST be defensively designed to prevent accidental tenant data leakage.

At the data layer:
- Preferred strategy: **database-per-tenant** or equivalent strong isolation.
- Shared schemas with tenant identifiers are allowed only as transitional measures
  and must not weaken isolation guarantees.

### Control Plane vs Tenant Plane
The architecture is split into two logical planes:

**Control Plane (shared):**
- Tenant registry
- Tenant provisioning and lifecycle
- Global configuration
- Licensing / billing (if applicable)
- AI orchestration logic

**Tenant Plane (isolated per tenant):**
- Compliance processes
- Registries (RoPA, BIA, Incidents, Training, Audits)
- Tenant users and roles
- Tenant-scoped audit logs

No business or compliance data from the tenant plane may be accessed or processed
by the control plane except through strictly defined administrative operations.

### Global SUPERADMIN
A **global SUPERADMIN role is mandatory**.

The SUPERADMIN:
- is global and NOT associated with any tenant
- manages tenant lifecycle (create, suspend, list)
- cannot access tenant internal compliance data
- cannot act as a tenant user
- exists to enforce governance, not business operations

This separation is required to:
- avoid privilege escalation
- maintain auditability
- satisfy regulatory accountability requirements (including NIS2).

### AI and Multitenancy
AI components:
- must always operate in a **tenant-scoped context**
- must never mix or reuse data across tenants
- must not cache or retain tenant data beyond explicit processing scope

AI is **assistive only** and may not:
- take final compliance decisions
- generate legally binding outcomes
- override human responsibility

## Alternatives Considered

### Shared Database with tenant_id column
Rejected because:
- higher risk of data leakage
- more difficult to prove isolation during audits
- error-prone in automated code generation contexts

### Single global admin with tenant impersonation
Rejected because:
- violates least privilege principles
- complicates audit trails
- increases blast radius of errors.

## Consequences

### Positive
- Strong isolation and security posture
- Clear accountability per tenant
- Easier compliance audits
- Safer use of AI-assisted development
- Architecture suitable for regulated customers

### Negative
- Higher infrastructure and operational complexity
- Increased provisioning overhead
- More explicit design required in early stages

These trade-offs are acceptable given the platform’s regulatory requirements.

## Implementation Notes
- This ADR is **normative** and must be respected by all implementation work.
- Any change to multitenancy or isolation strategy requires a new ADR.
- Copilot-generated code must comply with this decision.

``