/**
 * SuperadminTenantsPage – Control Plane page for SUPERADMIN only.
 *
 * What this page does:
 *   - Lists all tenants (stub data)
 *   - Allows creating a new tenant
 *   - Allows suspending a tenant
 *
 * What this page MUST NOT do:
 *   - Display or link to any tenant-internal compliance data.
 *   - Set or consume a TenantContext.
 *   - Render a TenantLayout.
 *
 * COMPLIANCE (ADR-001):
 *   This page exists exclusively in the Control Plane.
 *   The SUPERADMIN has no tenant affiliation and must not act as a tenant user.
 *
 * WHY stub data:
 *   The backend API exists (GET /tenants, POST /tenants, PATCH /tenants/{id}/suspend)
 *   but real HTTP calls are deferred to the integration milestone.
 *   The stub makes the routing and role separation verifiable now.
 */

import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

// ---------------------------------------------------------------------------
// Stub data – replace with real API calls via httpClient
// ---------------------------------------------------------------------------

interface Tenant {
  id: string;
  name: string;
  status: "active" | "suspended";
}

const STUB_TENANTS: Tenant[] = [
  { id: "00000000-0000-0000-0000-000000000001", name: "Acme Corp", status: "active" },
  { id: "00000000-0000-0000-0000-000000000002", name: "Globex Inc", status: "active" },
  { id: "00000000-0000-0000-0000-000000000003", name: "Initech Ltd", status: "suspended" },
];

export function SuperadminTenantsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tenants, setTenants] = useState<Tenant[]>(STUB_TENANTS);
  const [newTenantName, setNewTenantName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Safety guard – this page should only be reachable by SUPERADMIN
  // (RequireAuth enforces this, but belt-and-suspenders here)
  if (user?.role !== "SUPERADMIN") {
    return <p style={{ color: "red" }}>Access denied.</p>;
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTenantName.trim();
    if (!name) {
      setCreateError("Tenant name is required.");
      return;
    }
    // Stub: add locally; real implementation calls POST /tenants
    const newTenant: Tenant = {
      id: crypto.randomUUID(),
      name,
      status: "active",
    };
    setTenants((prev) => [...prev, newTenant]);
    setNewTenantName("");
    setCreateError(null);
  };

  const handleSuspend = (id: string) => {
    // Stub: toggle locally; real implementation calls PATCH /tenants/{id}/suspend
    setTenants((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === "active" ? "suspended" : "active" } : t
      )
    );
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div style={styles.page}>
      {/* SUPERADMIN header – no tenant badge, no tenant data */}
      <header style={styles.header}>
        <span style={styles.brand}>Compliance Ops – Control Plane</span>
        <span style={styles.roleBadge}>SUPERADMIN</span>
        <span style={styles.userBadge}>{user.username}</span>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main style={styles.main}>
        <h2>Tenant Registry</h2>
        <p style={styles.notice}>
          You are operating in the <strong>Control Plane</strong>.
          No tenant compliance data is accessible from this view.
        </p>

        {/* Tenant list */}
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Tenant ID</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td style={styles.td}>
                  <code>{t.id}</code>
                </td>
                <td style={styles.td}>{t.name}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      background: t.status === "active" ? "#d4edda" : "#f8d7da",
                      color: t.status === "active" ? "#155724" : "#721c24",
                    }}
                  >
                    {t.status}
                  </span>
                </td>
                <td style={styles.td}>
                  <button
                    style={styles.actionBtn}
                    onClick={() => handleSuspend(t.id)}
                  >
                    {t.status === "active" ? "Suspend" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Create tenant form */}
        <section style={styles.createSection}>
          <h3>Create Tenant</h3>
          <form onSubmit={handleCreate} style={styles.createForm}>
            <input
              style={styles.input}
              type="text"
              placeholder="Organisation name"
              value={newTenantName}
              onChange={(e) => setNewTenantName(e.target.value)}
            />
            <button style={styles.createBtn} type="submit">
              Create
            </button>
          </form>
          {createError && <p style={styles.error}>{createError}</p>}
        </section>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { fontFamily: "sans-serif", minHeight: "100vh" },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "0.75rem 1.5rem",
    background: "#2c3e50",
    color: "#fff",
  },
  brand: { fontWeight: "bold", fontSize: "1.1rem", marginRight: "auto" },
  roleBadge: {
    background: "#e74c3c",
    padding: "0.2rem 0.65rem",
    borderRadius: "4px",
    fontSize: "0.8rem",
    fontWeight: "bold",
  },
  userBadge: { fontSize: "0.85rem", opacity: 0.85 },
  logoutBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.5)",
    color: "#fff",
    padding: "0.25rem 0.75rem",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  main: { padding: "2rem" },
  notice: {
    background: "#fff3cd",
    border: "1px solid #ffc107",
    padding: "0.75rem 1rem",
    borderRadius: "4px",
    marginBottom: "1.5rem",
    fontSize: "0.9rem",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "2rem",
  },
  th: {
    textAlign: "left",
    padding: "0.6rem 1rem",
    background: "#ecf0f1",
    borderBottom: "2px solid #bdc3c7",
  },
  td: {
    padding: "0.6rem 1rem",
    borderBottom: "1px solid #ecf0f1",
    verticalAlign: "middle",
  },
  statusBadge: {
    padding: "0.2rem 0.6rem",
    borderRadius: "4px",
    fontSize: "0.8rem",
    fontWeight: "bold",
  },
  actionBtn: {
    padding: "0.25rem 0.75rem",
    cursor: "pointer",
    border: "1px solid #bdc3c7",
    borderRadius: "4px",
    background: "#fff",
    fontSize: "0.85rem",
  },
  createSection: {
    background: "#f8f9fa",
    border: "1px solid #dee2e6",
    borderRadius: "6px",
    padding: "1.25rem",
    maxWidth: "480px",
  },
  createForm: { display: "flex", gap: "0.5rem" },
  input: {
    flex: 1,
    padding: "0.5rem 0.75rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "0.95rem",
  },
  createBtn: {
    padding: "0.5rem 1rem",
    background: "#2c3e50",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  error: { color: "#c0392b", fontSize: "0.85rem" },
};
