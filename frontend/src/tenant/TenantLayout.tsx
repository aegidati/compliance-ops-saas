/**
 * TenantLayout – wrapper rendered around all tenant-scoped pages.
 *
 * Responsibilities:
 *   1. Derive the tenantId from the :tenantId URL parameter.
 *   2. Validate it against the authenticated user's claims (ADR-001).
 *   3. Populate TenantContext so child pages never need to parse the URL.
 *   4. Render a consistent header with the active tenant badge.
 *
 * WHY validate here and not in RequireAuth:
 *   RequireAuth checks role (SUPERADMIN vs USER).  TenantLayout checks that
 *   the tenantId in the URL matches the one the user is authorised for.
 *   These are separate security concerns – keeping them separate is cleaner
 *   and easier to audit.
 *
 * COMPLIANCE (ADR-001):
 *   - A SUPERADMIN must never reach this layout (RequireAuth blocks them).
 *   - A tenant user must only see their own tenant's data.
 *   - If the URL tenant does not match the token tenant, access is denied.
 */

import { useEffect } from "react";
import { Outlet, useParams, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useTenant } from "./TenantContext";

export function TenantLayout() {
  const { tenantId: urlTenantId } = useParams<{ tenantId: string }>();
  const { user, logout } = useAuth();
  const { tenantId: contextTenantId, setTenantId, clearTenant } = useTenant();
  const navigate = useNavigate();

  // -------------------------------------------------------------------------
  // Tenant ID validation (ADR-001: explicit, never default)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!urlTenantId) return;

    // A tenant user may only access their own tenant.
    // WHY compare against token claim, not just the URL:
    //   The URL is user-controlled. The token claim is backend-signed.
    if (user?.tenant_id && user.tenant_id !== urlTenantId) {
      // Attempted cross-tenant access – deny immediately.
      console.warn(
        `[TenantLayout] Cross-tenant access attempt: ` +
          `token tenant=${user.tenant_id}, url tenant=${urlTenantId}`
      );
      clearTenant();
      navigate("/login", { replace: true });
      return;
    }

    setTenantId(urlTenantId);
  }, [urlTenantId, user, setTenantId, clearTenant, navigate]);

  // Safety: if there is no URL tenant param, something is wrong with routing.
  if (!urlTenantId) {
    return <Navigate to="/login" replace />;
  }

  // Block SUPERADMIN from ever landing here (belt-and-suspenders).
  if (user?.role === "SUPERADMIN") {
    return <Navigate to="/superadmin/tenants" replace />;
  }

  const handleLogout = () => {
    clearTenant();
    logout();
  };

  return (
    <div style={styles.wrapper}>
      {/* Tenant-scoped header */}
      <header style={styles.header}>
        <span style={styles.brand}>Compliance Ops</span>
        <span style={styles.tenantBadge}>
          Tenant: <strong>{contextTenantId ?? urlTenantId}</strong>
        </span>
        <span style={styles.userBadge}>{user?.username}</span>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </header>

      {/* Page content */}
      <main style={styles.main}>
        <Outlet />
      </main>

      {/* Explicit tenant badge in footer to aid QA and compliance review */}
      <footer style={styles.footer}>
        <small>
          Tenant context: <code>{contextTenantId ?? "—"}</code>
        </small>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Minimal inline styles – no external CSS framework dependency at this stage
// ---------------------------------------------------------------------------
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    fontFamily: "sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "0.75rem 1.5rem",
    background: "#1a3c5e",
    color: "#fff",
  },
  brand: {
    fontWeight: "bold",
    fontSize: "1.1rem",
    marginRight: "auto",
  },
  tenantBadge: {
    background: "#0d6efd",
    padding: "0.25rem 0.75rem",
    borderRadius: "4px",
    fontSize: "0.85rem",
  },
  userBadge: {
    fontSize: "0.85rem",
    opacity: 0.85,
  },
  logoutBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.5)",
    color: "#fff",
    padding: "0.25rem 0.75rem",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  main: {
    flex: 1,
    padding: "2rem",
  },
  footer: {
    padding: "0.5rem 1.5rem",
    background: "#f4f4f4",
    borderTop: "1px solid #ddd",
    textAlign: "center",
    color: "#666",
  },
};
