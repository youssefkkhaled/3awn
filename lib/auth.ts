import { isPostgresConfigured } from "@/lib/env";
import * as postgresAuth from "@/lib/auth-postgres";
import * as sqliteAuth from "@/lib/auth-sqlite";

function getAuthProvider() {
  return (isPostgresConfigured() ? postgresAuth : sqliteAuth) as typeof sqliteAuth;
}

export function getAdminSessionState(
  ...args: Parameters<typeof sqliteAuth.getAdminSessionState>
) {
  return getAuthProvider().getAdminSessionState(...args);
}

export function requireAdminUser(
  ...args: Parameters<typeof sqliteAuth.requireAdminUser>
) {
  return getAuthProvider().requireAdminUser(...args);
}

export function loginAdminUser(
  ...args: Parameters<typeof sqliteAuth.loginAdminUser>
) {
  return getAuthProvider().loginAdminUser(...args);
}

export function logoutAdminUser(
  ...args: Parameters<typeof sqliteAuth.logoutAdminUser>
) {
  return getAuthProvider().logoutAdminUser(...args);
}

export function assertAdminAuthenticated(
  ...args: Parameters<typeof sqliteAuth.assertAdminAuthenticated>
) {
  return getAuthProvider().assertAdminAuthenticated(...args);
}
