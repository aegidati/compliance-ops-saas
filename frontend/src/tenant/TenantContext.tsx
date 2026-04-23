/**
 * TenantContext – manages the active tenant for the current session.
 *
 * WHY a dedicated TenantContext (separate from AuthContext):
 *   Authentication (who you are) and tenant scope (which organisation you
 *   are acting for) are distinct concerns.  Keeping them separate:
 *   1. Prevents SUPERADMIN from ever accidentally acquiring a tenant context.
 *   2. Makes it straightforward to add future multi-tenant selection flows
 *      (e.g. a user belonging to multiple tenants).
 *   3. Satisfies ADR-001: every tenant-scoped operation must carry an
 *      explicit tenant_id – there is no "default" tenant.
 *
 * COMPLIANCE (ADR-001):
 *   - The context is NEVER pre-populated with a default tenant.
 *   - SUPERADMIN sessions MUST NOT set a tenant context.
 *   - Any attempt to derive tenant_id implicitly (e.g. from URL alone) must
 *     be validated against the authenticated user's authorised tenants.
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

export interface TenantContextValue {
  /** The currently active tenant UUID, or null when no tenant is selected. */
  tenantId: string | null;
  /**
   * Set the active tenant.
   *
   * Callers are responsible for ensuring the user is authorised for the
   * given tenantId before calling this function.
   */
  setTenantId: (id: string) => void;
  /** Clear the tenant context (e.g. on logout or role switch). */
  clearTenant: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TenantContext = createContext<TenantContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface TenantProviderProps {
  children: ReactNode;
}

/**
 * TenantProvider stores the active tenant ID for the current session.
 *
 * WHY NOT derive from URL alone:
 *   A user could craft a URL with an arbitrary tenantId.  The context must
 *   always be validated against the authenticated user's claims before being
 *   trusted.  TenantLayout performs this validation when mounting.
 */
export function TenantProvider({ children }: TenantProviderProps) {
  // No default – tenant must be explicitly set after authentication.
  const [tenantId, setTenantIdState] = useState<string | null>(null);

  const setTenantId = useCallback((id: string) => {
    if (!id || id.trim() === "") {
      // Refuse to set an empty tenant – would silently break isolation.
      console.error("[TenantContext] Attempted to set empty tenantId. Rejected.");
      return;
    }
    setTenantIdState(id);
  }, []);

  const clearTenant = useCallback(() => {
    setTenantIdState(null);
  }, []);

  return (
    <TenantContext.Provider value={{ tenantId, setTenantId, clearTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useTenant – convenience hook; throws if used outside TenantProvider.
 */
export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return ctx;
}
