/**
 * httpClient – tenant-aware HTTP client wrapper.
 *
 * WHY a wrapper instead of raw fetch:
 *   All API calls must carry:
 *   1. The Bearer token (authentication).
 *   2. An explicit X-Tenant-Id header when acting in a tenant context.
 *   Centralising this in one module prevents any call from accidentally
 *   omitting the tenant header, which would violate ADR-001.
 *
 * WHY NOT hardcode the backend URL:
 *   The base URL is read from the VITE_API_BASE_URL environment variable,
 *   which is set at build time.  This keeps secrets and env-specific
 *   configuration out of source code.
 *
 * COMPLIANCE (ADR-001):
 *   - Every tenant-scoped request includes X-Tenant-Id.
 *   - SUPERADMIN requests omit X-Tenant-Id (no tenant affiliation).
 *   - callers must explicitly pass tenantId; no implicit default is applied.
 */

// ---------------------------------------------------------------------------
// Configuration – env-driven, never hardcoded
// ---------------------------------------------------------------------------

/**
 * Base URL for the FastAPI backend.
 *
 * Set VITE_API_BASE_URL in your .env file, for example:
 *   VITE_API_BASE_URL=http://localhost:8000
 *
 * WHY VITE_ prefix: Vite only exposes variables with this prefix to the
 * browser bundle, preventing accidental leakage of server-side secrets.
 */
const API_BASE_URL: string =
  (import.meta as unknown as { env: Record<string, string> }).env
    .VITE_API_BASE_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
}

interface ClientOptions {
  /** Bearer token from AuthContext.  Required for all non-public endpoints. */
  token?: string | null;
  /**
   * Tenant UUID.  Must be provided for tenant-scoped endpoints.
   * Must be omitted (or null) for SUPERADMIN / control-plane endpoints.
   *
   * WHY explicit parameter: callers must consciously decide whether this
   * is a tenant-scoped call – no automatic injection from global state.
   */
  tenantId?: string | null;
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

/**
 * apiFetch – thin wrapper around the native fetch API.
 *
 * Adds:
 *   - Authorization header (Bearer token)
 *   - X-Tenant-Id header (when tenantId is provided)
 *   - Content-Type: application/json by default
 *
 * Throws on non-2xx responses with a structured error message.
 */
export async function apiFetch<T>(
  path: string,
  { token, tenantId }: ClientOptions = {},
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };

  // Attach auth token when provided
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Attach tenant context header when provided.
  // NEVER attach a default tenant ID; absence of tenantId is intentional
  // for SUPERADMIN or unauthenticated requests.
  if (tenantId) {
    headers["X-Tenant-Id"] = tenantId;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const body = await response.json();
      errorDetail = body.detail ?? JSON.stringify(body);
    } catch {
      // Response body is not JSON – keep statusText
    }
    throw new Error(`API error ${response.status}: ${errorDetail}`);
  }

  // Return parsed JSON, or undefined for 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

export const apiGet = <T>(
  path: string,
  clientOptions?: ClientOptions
): Promise<T> => apiFetch<T>(path, clientOptions, { method: "GET" });

export const apiPost = <T>(
  path: string,
  body: unknown,
  clientOptions?: ClientOptions
): Promise<T> =>
  apiFetch<T>(path, clientOptions, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const apiPatch = <T>(
  path: string,
  body: unknown,
  clientOptions?: ClientOptions
): Promise<T> =>
  apiFetch<T>(path, clientOptions, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
