/**
 * AuthContext – manages authentication state for the entire application.
 *
 * WHY a dedicated AuthContext:
 *   Authentication is a cross-cutting concern.  Placing it in a Context makes
 *   the current user/role available everywhere without prop-drilling, and
 *   allows route guards (RequireAuth) to enforce access control in one place.
 *
 * WHY stub / mock auth:
 *   At this stage no real identity provider exists.  The stub allows the full
 *   routing and role-separation structure to be built and validated before
 *   wiring in a real token exchange.
 *
 * COMPLIANCE (ADR-001):
 *   The token payload MUST carry role and tenant_id.
 *   SUPERADMIN tokens MUST have tenant_id = null.
 *   USER tokens MUST have an explicit tenant_id (never null or "default").
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Roles mirror the backend UserRole enum (ADR-001). */
export type UserRole = "SUPERADMIN" | "USER";

/**
 * The subset of the JWT payload the frontend cares about.
 * tenant_id is null for SUPERADMIN – this is intentional and mandatory.
 */
export interface AuthUser {
  username: string;
  role: UserRole;
  /** null for SUPERADMIN; UUID string for tenant users. Never "default". */
  tenant_id: string | null;
  /** Raw opaque token returned by the backend. */
  access_token: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  /** Exchange credentials for a token.  Returns error message on failure. */
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  isAuthenticated: boolean;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider wraps the application and exposes auth state.
 *
 * Stub implementation stores the token in component state only (no
 * localStorage) to avoid persistence concerns in the prototype phase.
 * Production integration must use a secure, httpOnly cookie or similar.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);

  /**
   * Stub login – simulates the POST /auth/login response.
   *
   * WHY stubs for specific usernames:
   *   Allows manual QA of role separation without a running backend.
   *   Both branches are intentional – remove before production.
   *
   * SECURITY: real implementation must call the backend and validate
   *   the returned JWT signature before trusting its claims.
   */
  const login = useCallback(
    async (username: string, password: string): Promise<string | null> => {
      // ----------------------------------------------------------------
      // STUB – replace with real fetch call to POST /auth/login
      // ----------------------------------------------------------------
      if (!username || !password) {
        return "Username and password are required.";
      }

      if (username === "superadmin" && password === "superadmin") {
        setUser({
          username: "superadmin",
          role: "SUPERADMIN",
          tenant_id: null, // SUPERADMIN has NO tenant affiliation (ADR-001)
          access_token: "stub-superadmin-token",
        });
        return null; // null = success
      }

      if (username === "tenant_user" && password === "tenant_user") {
        setUser({
          username: "tenant_user",
          role: "USER",
          tenant_id: "00000000-0000-0000-0000-000000000001", // explicit UUID
          access_token: "stub-tenant-user-token",
        });
        return null;
      }

      return "Invalid credentials.";
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    login,
    logout,
    isAuthenticated: user !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useAuth – convenience hook; throws if used outside AuthProvider.
 *
 * WHY throw instead of returning null:
 *   A missing provider is always a programming error.  Failing loudly at
 *   development time is safer than silently returning undefined auth state.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
