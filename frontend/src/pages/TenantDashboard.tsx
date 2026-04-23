/**
 * TenantDashboard – entry page for a tenant user after login.
 *
 * What this page does:
 *   - Confirms the active tenant context to the user.
 *   - Provides placeholders for future compliance feature navigation.
 *
 * What this page MUST NOT do:
 *   - Display data from other tenants.
 *   - Operate without an explicit tenant context.
 *
 * COMPLIANCE (ADR-001 / ADR-002):
 *   - All data displayed must be scoped to the active tenantId.
 *   - AI-assisted features (when added) must be labelled as draft/suggestion
 *     and require human review before any action is taken.
 */

import { useTenant } from "../tenant/TenantContext";
import { useAuth } from "../auth/AuthContext";

export function TenantDashboard() {
  const { tenantId } = useTenant();
  const { user } = useAuth();

  // Defensive: if tenant context somehow not set, show an error.
  // TenantLayout should prevent this state, but guard here for safety.
  if (!tenantId) {
    return (
      <div style={styles.error}>
        <strong>Error:</strong> No tenant context is active. Please log in again.
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h2>Dashboard</h2>
      <p style={styles.contextLine}>
        Viewing compliance data for tenant:{" "}
        <strong>
          <code>{tenantId}</code>
        </strong>
      </p>

      {user && (
        <p style={styles.userLine}>
          Signed in as <strong>{user.username}</strong>
        </p>
      )}

      {/* Placeholder feature tiles */}
      <div style={styles.grid}>
        {FEATURE_TILES.map((tile) => (
          <div key={tile.title} style={styles.tile}>
            <h3 style={styles.tileTitle}>{tile.title}</h3>
            <p style={styles.tileDesc}>{tile.description}</p>
            <span style={styles.tileBadge}>Coming soon</span>
          </div>
        ))}
      </div>

      {/* ADR-002 compliance notice */}
      <aside style={styles.aiNotice}>
        <strong>AI Guardrail (ADR-002):</strong> Any AI-generated suggestions on
        this platform are assistive only. No automated compliance decisions are
        made. Human review and approval is always required before any action.
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature placeholders – no business logic, no real data
// ---------------------------------------------------------------------------

const FEATURE_TILES = [
  {
    title: "RoPA Register",
    description: "Record of Processing Activities – manage data processing records.",
  },
  {
    title: "Incident Management",
    description: "Track and manage compliance incidents and data breaches.",
  },
  {
    title: "Risk Assessment",
    description: "Identify, assess and mitigate compliance risks.",
  },
  {
    title: "Audit Log",
    description: "Tenant-scoped audit trail of all actions and changes.",
  },
];

const styles: Record<string, React.CSSProperties> = {
  page: { fontFamily: "sans-serif" },
  contextLine: {
    background: "#e8f4f8",
    border: "1px solid #b8daff",
    padding: "0.6rem 1rem",
    borderRadius: "4px",
    marginBottom: "0.5rem",
    fontSize: "0.95rem",
  },
  userLine: {
    color: "#555",
    fontSize: "0.9rem",
    marginBottom: "1.5rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "1rem",
    marginBottom: "2rem",
  },
  tile: {
    background: "#fff",
    border: "1px solid #dee2e6",
    borderRadius: "6px",
    padding: "1.25rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  tileTitle: { margin: "0 0 0.5rem", fontSize: "1rem", color: "#1a3c5e" },
  tileDesc: { fontSize: "0.85rem", color: "#666", margin: "0 0 0.75rem" },
  tileBadge: {
    background: "#e9ecef",
    padding: "0.15rem 0.5rem",
    borderRadius: "3px",
    fontSize: "0.75rem",
    color: "#6c757d",
  },
  aiNotice: {
    background: "#fff8e1",
    border: "1px solid #ffe082",
    borderRadius: "4px",
    padding: "0.75rem 1rem",
    fontSize: "0.85rem",
    color: "#5a4000",
  },
  error: {
    background: "#f8d7da",
    border: "1px solid #f5c6cb",
    padding: "1rem",
    borderRadius: "4px",
    color: "#721c24",
  },
};
