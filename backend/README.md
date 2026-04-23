# Compliance Operations SaaS – Backend

## Overview

FastAPI backend scaffold for the multitenant Compliance Operations SaaS platform.

This service is the starting point for the **Control Plane** of the platform.  It manages
tenant lifecycle and provides the foundation for future compliance-domain features
(GDPR, ISO 27001, NIS2, 231).

---

## Architecture Principles

| Principle | Implementation |
|---|---|
| **Tenant isolation** | Every action that touches tenant data requires an explicit `tenant_id` in the token |
| **SUPERADMIN separation** | SUPERADMIN tokens carry no `tenant_id`; they can only manage tenant lifecycle |
| **Auditability** | Every state-changing action emits a structured JSON audit entry to stdout |
| **No hardcoded secrets** | All credentials are environment-variable driven |
| **Stub-first** | Authentication is a verified stub; identity provider integration is a future step |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI bootstrap, /health endpoint
│   ├── core/
│   │   ├── config.py        # pydantic-settings configuration (env-driven)
│   │   └── security.py      # JWT helpers, password verify, role guards
│   ├── auth/
│   │   ├── models.py        # LoginRequest, LoginResponse, UserRole
│   │   └── router.py        # POST /auth/login
│   ├── tenants/
│   │   ├── models.py        # Tenant model, in-memory store (stub)
│   │   └── router.py        # POST/GET /tenants, PATCH /tenants/{id}/suspend
│   └── audit/
│       ├── models.py        # AuditEntry model
│       └── logger.py        # Structured audit logger
├── tests/
│   └── test_healthcheck.py  # Full suite: health, auth, tenants, role enforcement
├── requirements.txt
└── README.md
```

---

## Quick Start

### 1. Prerequisites

- Python 3.12+

### 2. Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Configure environment

Copy and edit the example env file:

```bash
cp .env.example .env   # (create .env.example from the template below)
```

Minimum required variables:

```dotenv
# Application environment: development | test | production
APP_ENV=development

# JWT signing secret – generate a strong random string for production
SECRET_KEY=change-me-before-deploying

# Bootstrap SUPERADMIN credentials
# Username: any string
SUPERADMIN_USERNAME=superadmin

# Password hash: generate with:
#   python -c "from passlib.hash import bcrypt; print(bcrypt.hash('yourpassword'))"
SUPERADMIN_PASSWORD_HASH=<bcrypt-hash-here>
```

> **Never** commit a real `.env` file to source control.  The `.gitignore` excludes it.

### 4. Run the server

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs are available at http://localhost:8000/docs (disabled in production).

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | None | Liveness probe |
| `POST` | `/auth/login` | None | Obtain Bearer token |
| `POST` | `/tenants` | SUPERADMIN | Create a new tenant |
| `GET` | `/tenants` | SUPERADMIN | List all tenants |
| `PATCH` | `/tenants/{id}/suspend` | SUPERADMIN | Suspend a tenant |

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

---

## Security Considerations

- Passwords are never stored in plaintext.  Only bcrypt hashes (cost factor ≥ 12) are accepted.
- The `REPLACE_WITH_BCRYPT_HASH` placeholder causes all login attempts to fail until properly configured.
- JWT tokens expire after `ACCESS_TOKEN_EXPIRE_MINUTES` minutes (default: 60).
- CORS origins are empty by default; explicitly set them for frontend integration.
- The `/docs` endpoint is disabled when `APP_ENV=production`.

---

## Audit Log

Every state-changing action emits a structured JSON line to stdout:

```json
{"audit":true,"timestamp":"2026-01-01T00:00:00+00:00","actor":"superadmin","role":"SUPERADMIN","tenant_id":"...","action":"CREATE_TENANT","details":{"name":"Acme Corp"}}
```

Fields: `audit`, `timestamp` (UTC ISO 8601), `actor`, `role`, `tenant_id` (nullable), `action`, `details`.

---

## What Is Not Yet Implemented

- Tenant-scoped user authentication (returns HTTP 501)
- Persistent storage (in-memory only)
- External identity provider (e.g. Azure AD, Entra ID)
- Per-tenant data plane isolation

These items are intentionally deferred and will be tracked in separate issues.
