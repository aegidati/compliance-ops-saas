/**
 * router.tsx – application routing configuration.
 *
 * Route structure:
 *
 *   /login                        – public
 *   /superadmin/tenants           – SUPERADMIN only (Control Plane)
 *   /tenant/:tenantId/dashboard   – Tenant USER only (Tenant Plane)
 *   /tenant-redirect              – post-login redirect helper for USER role
 *   /                             – redirects to /login
 *   *                             – 404 redirects to /login
 *
 * WHY flat route definitions here:
 *   Centralising all routes in one file gives a complete, auditable picture
 *   of the application's access surface.  Any route change is a single
 *   diff in one file, making security reviews straightforward.
 *
 * COMPLIANCE (ADR-001):
 *   - RequireAuth wraps all protected routes.
 *   - TenantLayout validates the URL tenantId against the token claim.
 *   - SUPERADMIN and USER routes are structurally separated.
 */

import { createBrowserRouter, Navigate } from "react-router-dom";
import { RequireAuth } from "../auth/RequireAuth";
import { TenantLayout } from "../tenant/TenantLayout";
import { LoginPage } from "../pages/LoginPage";
import { SuperadminTenantsPage } from "../pages/SuperadminTenantsPage";
import { TenantDashboard } from "../pages/TenantDashboard";
import { TenantRedirect } from "./TenantRedirect";

export const router = createBrowserRouter([
  // --------------------------------------------------------------------------
  // Public routes
  // --------------------------------------------------------------------------
  {
    path: "/login",
    element: <LoginPage />,
  },

  // --------------------------------------------------------------------------
  // Control Plane – SUPERADMIN only
  // WHY separate path prefix /superadmin:
  //   Visual separation in URLs makes it obvious when an admin is on the
  //   control plane.  It also allows server-side WAF rules to restrict
  //   this prefix to known admin IP ranges in production.
  // --------------------------------------------------------------------------
  {
    path: "/superadmin/tenants",
    element: (
      <RequireAuth requiredRole="SUPERADMIN">
        <SuperadminTenantsPage />
      </RequireAuth>
    ),
  },

  // --------------------------------------------------------------------------
  // Tenant Plane – USER only
  // WHY :tenantId in the path:
  //   Makes the active tenant explicit and bookmarkable.  The tenantId is
  //   validated against the token in TenantLayout – it is NOT trusted at
  //   face value from the URL.
  // --------------------------------------------------------------------------
  {
    path: "/tenant/:tenantId",
    element: (
      <RequireAuth requiredRole="USER">
        <TenantLayout />
      </RequireAuth>
    ),
    children: [
      {
        path: "dashboard",
        element: <TenantDashboard />,
      },
      // Redirect bare /tenant/:id to dashboard
      {
        index: true,
        element: <Navigate to="dashboard" replace />,
      },
    ],
  },

  // --------------------------------------------------------------------------
  // Post-login redirect helper for USER role
  // WHY a dedicated route:
  //   After login, the LoginPage navigates here.  This component reads the
  //   tenantId from AuthContext and redirects to the correct tenant route,
  //   ensuring the tenant_id is always sourced from the token, not the URL.
  // --------------------------------------------------------------------------
  {
    path: "/tenant-redirect",
    element: (
      <RequireAuth requiredRole="USER">
        <TenantRedirect />
      </RequireAuth>
    ),
  },

  // --------------------------------------------------------------------------
  // Root and fallback
  // --------------------------------------------------------------------------
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);
