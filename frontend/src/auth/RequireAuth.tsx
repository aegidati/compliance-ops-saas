/**
 * RequireAuth – route guard component.
 *
 * WHY a dedicated guard component:
 *   Centralising access control in one component prevents scattered,
 *   inconsistent checks across pages.  A single guard is easier to audit
 *   and update (relevant for ISO 27001 access-control reviews).
 *
 * COMPLIANCE (ADR-001):
 *   - Unauthenticated users are redirected to /login.
 *   - SUPERADMIN users are blocked from tenant-scoped routes.
 *   - Tenant users are blocked from SUPERADMIN-only routes.
 *   - Role mismatch redirects to a safe fallback, not a blank screen.
 */

import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type UserRole } from "./AuthContext";
import type { ReactNode } from "react";

interface RequireAuthProps {
  children: ReactNode;
  /**
   * When provided, the route is only accessible to users with this exact role.
   * Omit to allow any authenticated user.
   */
  requiredRole?: UserRole;
}

export function RequireAuth({ children, requiredRole }: RequireAuthProps) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // 1. Not authenticated at all – send to login preserving the intended path
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Role mismatch – redirect to the appropriate home for the actual role
  if (requiredRole && user.role !== requiredRole) {
    const fallback =
      user.role === "SUPERADMIN"
        ? "/superadmin/tenants"
        : `/tenant/${user.tenant_id}/dashboard`;
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
