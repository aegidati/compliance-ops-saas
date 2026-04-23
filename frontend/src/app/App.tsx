/**
 * App.tsx – application root.
 *
 * Responsibilities:
 *   1. Mount global context providers (Auth, Tenant).
 *   2. Mount the router.
 *
 * WHY the provider order matters:
 *   - AuthProvider must wrap TenantProvider because TenantLayout reads both.
 *   - RouterProvider is the outermost React Router boundary.
 *
 * COMPLIANCE (ADR-001):
 *   Both AuthProvider and TenantProvider are always mounted.
 *   There is never a "default" tenant in TenantContext.
 */

import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { TenantProvider } from "../tenant/TenantContext";
import { router } from "./router";

export function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <RouterProvider router={router} />
      </TenantProvider>
    </AuthProvider>
  );
}
