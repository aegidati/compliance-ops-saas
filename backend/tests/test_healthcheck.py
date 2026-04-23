"""
Tests for the FastAPI backend scaffold.

Covers:
  - Health check endpoint (unauthenticated, always available)
  - SUPERADMIN login (stub credential via env)
  - Tenant creation (SUPERADMIN only)
  - Role enforcement (tenant USER cannot create tenants)
  - Duplicate tenant name rejection
  - Tenant suspension lifecycle

WHY TestClient + httpx: no real server needed; tests are fast and
deterministic.  The in-memory tenant store is reset between test
functions via the reset_store fixture.
"""

from __future__ import annotations

import os
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from passlib.hash import bcrypt

# ------------------------------------------------------------------
# Inject test credentials BEFORE importing the app so that pydantic-settings
# reads them.  Using a known plaintext password lets us mint real tokens
# without hardcoding anything in source.
# ------------------------------------------------------------------
_TEST_PASSWORD = "test-superadmin-password"
_TEST_HASH = bcrypt.hash(_TEST_PASSWORD)

os.environ["SUPERADMIN_USERNAME"] = "superadmin"
os.environ["SUPERADMIN_PASSWORD_HASH"] = _TEST_HASH
os.environ["SECRET_KEY"] = "test-secret-key-for-ci-only-minimum-32-bytes"
os.environ["APP_ENV"] = "test"

# Import app AFTER setting env vars
from app.main import app  # noqa: E402  (must come after env setup)
from app.tenants.models import _tenant_store  # noqa: E402


@pytest.fixture(autouse=True)
def reset_store() -> Generator:
    """Clear the in-memory tenant store before every test."""
    _tenant_store.clear()
    yield
    _tenant_store.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def superadmin_token(client: TestClient) -> str:
    """Return a valid SUPERADMIN Bearer token."""
    resp = client.post(
        "/auth/login",
        json={"username": "superadmin", "password": _TEST_PASSWORD},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture
def superadmin_headers(superadmin_token: str) -> dict:
    return {"Authorization": f"Bearer {superadmin_token}"}


# ------------------------------------------------------------------
# Health check
# ------------------------------------------------------------------

class TestHealthCheck:
    def test_health_returns_200(self, client: TestClient) -> None:
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_health_response_body(self, client: TestClient) -> None:
        resp = client.get("/health")
        body = resp.json()
        assert body["status"] == "ok"
        assert "env" in body

    def test_health_is_unauthenticated(self, client: TestClient) -> None:
        """Health must be reachable without any token."""
        resp = client.get("/health")
        assert resp.status_code == 200


# ------------------------------------------------------------------
# Authentication
# ------------------------------------------------------------------

class TestLogin:
    def test_superadmin_login_success(self, client: TestClient) -> None:
        resp = client.post(
            "/auth/login",
            json={"username": "superadmin", "password": _TEST_PASSWORD},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["role"] == "SUPERADMIN"
        assert body["tenant_id"] is None

    def test_wrong_password_returns_401(self, client: TestClient) -> None:
        resp = client.post(
            "/auth/login",
            json={"username": "superadmin", "password": "wrong"},
        )
        assert resp.status_code == 401

    def test_unknown_username_returns_501(self, client: TestClient) -> None:
        """Tenant user login is not yet implemented."""
        resp = client.post(
            "/auth/login",
            json={"username": "tenant_user", "password": "anything"},
        )
        assert resp.status_code == 501

    def test_login_does_not_echo_password(self, client: TestClient) -> None:
        resp = client.post(
            "/auth/login",
            json={"username": "superadmin", "password": _TEST_PASSWORD},
        )
        response_text = resp.text
        assert _TEST_PASSWORD not in response_text


# ------------------------------------------------------------------
# Tenant management
# ------------------------------------------------------------------

class TestTenants:
    def test_create_tenant_success(
        self,
        client: TestClient,
        superadmin_headers: dict,
    ) -> None:
        resp = client.post(
            "/tenants",
            json={"name": "Acme Corp"},
            headers=superadmin_headers,
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "Acme Corp"
        assert body["status"] == "active"
        assert "tenant_id" in body
        assert "created_at" in body

    def test_create_tenant_requires_auth(self, client: TestClient) -> None:
        resp = client.post("/tenants", json={"name": "NoAuth Corp"})
        assert resp.status_code == 403

    def test_create_tenant_requires_superadmin(
        self,
        client: TestClient,
    ) -> None:
        """A token with USER role must not be able to create tenants."""
        from app.core.security import create_access_token
        user_token = create_access_token(
            subject="tenant_user",
            role="USER",
            tenant_id="some-tenant-id",
        )
        resp = client.post(
            "/tenants",
            json={"name": "Unauthorised Corp"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert resp.status_code == 403

    def test_duplicate_tenant_name_returns_409(
        self,
        client: TestClient,
        superadmin_headers: dict,
    ) -> None:
        client.post(
            "/tenants",
            json={"name": "Duplicate Corp"},
            headers=superadmin_headers,
        )
        resp = client.post(
            "/tenants",
            json={"name": "Duplicate Corp"},
            headers=superadmin_headers,
        )
        assert resp.status_code == 409

    def test_list_tenants(
        self,
        client: TestClient,
        superadmin_headers: dict,
    ) -> None:
        client.post("/tenants", json={"name": "Alpha"}, headers=superadmin_headers)
        client.post("/tenants", json={"name": "Beta"}, headers=superadmin_headers)
        resp = client.get("/tenants", headers=superadmin_headers)
        assert resp.status_code == 200
        names = [t["name"] for t in resp.json()]
        assert "Alpha" in names
        assert "Beta" in names

    def test_suspend_tenant(
        self,
        client: TestClient,
        superadmin_headers: dict,
    ) -> None:
        create_resp = client.post(
            "/tenants",
            json={"name": "Suspend Me"},
            headers=superadmin_headers,
        )
        tenant_id = create_resp.json()["tenant_id"]

        suspend_resp = client.patch(
            f"/tenants/{tenant_id}/suspend",
            headers=superadmin_headers,
        )
        assert suspend_resp.status_code == 200
        assert suspend_resp.json()["status"] == "suspended"

    def test_suspend_nonexistent_tenant_returns_404(
        self,
        client: TestClient,
        superadmin_headers: dict,
    ) -> None:
        resp = client.patch(
            "/tenants/00000000-0000-0000-0000-000000000000/suspend",
            headers=superadmin_headers,
        )
        assert resp.status_code == 404

    def test_suspend_already_suspended_returns_409(
        self,
        client: TestClient,
        superadmin_headers: dict,
    ) -> None:
        create_resp = client.post(
            "/tenants",
            json={"name": "Double Suspend"},
            headers=superadmin_headers,
        )
        tenant_id = create_resp.json()["tenant_id"]
        client.patch(f"/tenants/{tenant_id}/suspend", headers=superadmin_headers)
        resp = client.patch(
            f"/tenants/{tenant_id}/suspend",
            headers=superadmin_headers,
        )
        assert resp.status_code == 409
