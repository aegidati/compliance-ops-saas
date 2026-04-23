/**
 * TenantRedirect – post-login redirect for USER role.
 *
 * WHY this exists:
 *   After login, LoginPage navigates to /tenant-redirect.
 *   This component reads the tenantId from AuthContext (sourced from the
 *   JWT token, not from user input) and redirects to the correct
 *   /tenant/:tenantId/dashboard URL.
 *
 * COMPLIANCE (ADR-001):
 *   The tenantId is derived from the authenticated user's token claim only.
 *   There is no default tenant fallback – missing tenant_id means access denied.
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function TenantRedirect() {
  const { user } = useAuth();

  // If the user has no tenant_id in their token, deny access.
  // This should not happen for a USER role, but guard defensively.
  if (!user?.tenant_id) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate to={`/tenant/${user.tenant_id}/dashboard`} replace />
  );
}
