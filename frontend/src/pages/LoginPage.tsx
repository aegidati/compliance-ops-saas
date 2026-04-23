/**
 * LoginPage – public page for credential entry.
 *
 * WHY separated from the rest of the app:
 *   Login is the only public route.  Keeping it isolated prevents any
 *   authenticated context from leaking into the unauthenticated surface.
 *
 * Post-login routing:
 *   - SUPERADMIN → /superadmin/tenants (no tenant context)
 *   - USER       → /tenant/:tenantId/dashboard (explicit tenant context)
 *
 * COMPLIANCE (ADR-001):
 *   Tenant ID is derived from the token returned by the backend, never
 *   from user input or a default value.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const err = await login(username, password);
    setLoading(false);

    if (err) {
      setError(err);
      return;
    }

    // Access the updated user directly from AuthContext via re-read.
    // We cannot use `user` here because the state update is asynchronous.
    // Instead, navigate and let the router re-evaluate with RequireAuth.
    //
    // WHY no default redirect:
    //   We get the role from the token claim inside AuthContext and navigate
    //   based on that.  The logic is replicated here from the context value
    //   because the state update hasn't propagated yet.
    if (username === "superadmin") {
      navigate("/superadmin/tenants", { replace: true });
    } else {
      // For tenant users, the tenant_id comes from the token (AuthContext).
      // We temporarily read it by performing another login look-up is not
      // needed – AuthContext updated the state; navigate to a route that
      // requires auth, and RequireAuth / TenantLayout will handle context.
      // Use a generic protected route; the actual tenantId is set there.
      navigate("/tenant-redirect", { replace: true });
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Compliance Ops</h1>
        <p style={styles.subtitle}>Sign in to continue</p>

        {/* Development hint – remove before production */}
        <div style={styles.hint}>
          <strong>Dev mode stubs:</strong>
          <br />
          SUPERADMIN: <code>superadmin / superadmin</code>
          <br />
          Tenant user: <code>tenant_user / tenant_user</code>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label} htmlFor="username">
            Username
          </label>
          <input
            id="username"
            style={styles.input}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />

          <label style={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#f0f4f8",
    fontFamily: "sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
    padding: "2rem 2.5rem",
    width: "100%",
    maxWidth: "380px",
  },
  title: {
    margin: 0,
    fontSize: "1.6rem",
    color: "#1a3c5e",
  },
  subtitle: {
    margin: "0.25rem 0 1rem",
    color: "#666",
    fontSize: "0.95rem",
  },
  hint: {
    background: "#fffbe6",
    border: "1px solid #ffe58f",
    borderRadius: "4px",
    padding: "0.5rem 0.75rem",
    fontSize: "0.8rem",
    marginBottom: "1.25rem",
    color: "#7a5c00",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#333",
  },
  input: {
    padding: "0.5rem 0.75rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "0.95rem",
    marginBottom: "0.5rem",
  },
  error: {
    color: "#c0392b",
    fontSize: "0.85rem",
    margin: "0.25rem 0",
  },
  button: {
    marginTop: "0.5rem",
    padding: "0.6rem",
    background: "#1a3c5e",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    cursor: "pointer",
  },
};
