# Compliance Ops SaaS – Frontend

React + TypeScript + Vite frontend shell for the Compliance Operations SaaS platform.

This is a **structural shell** aligned with:
- [ADR-001 – Multitenancy Model and Isolation Strategy](../docs/adr/ADR-001-multitenancy-model.md)
- [ADR-002 – AI Usage and Guardrails](../docs/adr/ADR-002-ai-usage-and-guardrails.md)

---

## Architecture Overview

```
frontend/src/
├── app/
│   ├── App.tsx             # Root component – mounts providers and router
│   ├── router.tsx          # All route definitions with role guards
│   └── TenantRedirect.tsx  # Post-login redirect helper for USER role
├── auth/
│   ├── AuthContext.tsx     # Authentication state + stub login
│   └── RequireAuth.tsx     # Route guard (unauthenticated / wrong role)
├── tenant/
│   ├── TenantContext.tsx   # Active tenant ID state (never defaults)
│   └── TenantLayout.tsx    # Layout wrapper + tenant ID validation
├── pages/
│   ├── LoginPage.tsx             # Public login form
│   ├── SuperadminTenantsPage.tsx  # Control Plane – SUPERADMIN only
│   └── TenantDashboard.tsx       # Tenant Plane – USER only
├── api/
│   └── httpClient.ts       # Tenant-aware HTTP client wrapper
└── main.tsx                # Entry point
```

### Key Design Decisions

| Decision | Reason |
|---|---|
| Explicit `TenantContext` separate from `AuthContext` | Authentication (who you are) and tenant scope (which org you act for) are distinct concerns. Prevents SUPERADMIN from ever acquiring a tenant context. |
| No default tenant | Any implicit tenant would violate ADR-001. Tenant ID must always come from the JWT token claim. |
| URL tenant validated against token | URL is user-controlled. Token claim is backend-signed. TenantLayout rejects mismatches. |
| `/superadmin/` path prefix | Visual separation of Control Plane from Tenant Plane. Enables server-side WAF rules. |
| Stub auth in AuthContext | Allows routing and role separation to be verified without a running backend. |

---

## Quick Start

### Prerequisites

- Node.js >= 18
- npm >= 9

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env to point VITE_API_BASE_URL at your backend
```

### 3. Run in development mode

```bash
npm run dev
```

The app will start at `http://localhost:5173`.

### 4. Build for production

```bash
npm run build
```

Output goes to `frontend/dist/`.

---

## Development Login Stubs

In development mode, two hardcoded credentials are available:

| Username | Password | Role | Behaviour |
|---|---|---|---|
| `superadmin` | `superadmin` | SUPERADMIN | Redirected to Control Plane `/superadmin/tenants` |
| `tenant_user` | `tenant_user` | USER | Redirected to `/tenant/00000000-0000-0000-0000-000000000001/dashboard` |

**Remove these stubs before connecting to a real identity provider.**

---

## Compliance Notes

- **No tenant defaults**: `TenantContext` is never pre-populated. Any route
  that requires a tenant will redirect to `/login` if none is set.
- **Cross-tenant access**: `TenantLayout` compares the URL `:tenantId` against
  the JWT `tenant_id` claim. Mismatches are rejected immediately.
- **SUPERADMIN isolation**: `RequireAuth` blocks SUPERADMIN from tenant-scoped
  routes. `TenantLayout` also has a belt-and-suspenders check.
- **AI guardrail notice**: `TenantDashboard` displays an explicit ADR-002
  reminder that AI outputs are assistive only.
- **No hardcoded backend URLs**: `VITE_API_BASE_URL` is required at build time.

---

## Running Backend Tests

Backend tests are independent of the frontend:

```bash
cd backend
pytest tests/ -v
```
