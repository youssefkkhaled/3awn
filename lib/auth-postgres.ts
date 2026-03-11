import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAdminEmail, getAdminPassword } from "@/lib/env";
import { AuthenticationAppError } from "@/lib/errors";
import { queryPostgres } from "@/lib/postgres";
import {
  createId,
  hashPassword,
  hashSessionToken,
  newSessionToken,
  nowIso,
  verifyPassword,
} from "@/lib/server-utils";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_TTL_DAYS = 7;

interface SessionUserRow {
  id: string;
  email: string;
}

function isEnvAdminMatch(username: string, password: string) {
  return (
    username.trim().toLowerCase() === getAdminEmail().trim().toLowerCase() &&
    password === getAdminPassword()
  );
}

async function syncEnvAdminUser() {
  const now = nowIso();

  await queryPostgres(
    `
      INSERT INTO admin_users (id, email, password_hash, created_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash
    `,
    ["local-admin", getAdminEmail(), hashPassword(getAdminPassword()), now],
  );

  return {
    id: "local-admin",
    email: getAdminEmail(),
  };
}

async function getSessionUserByToken(token: string): Promise<SessionUserRow | null> {
  const tokenHash = hashSessionToken(token);
  const now = nowIso();

  await queryPostgres("DELETE FROM admin_sessions WHERE expires_at <= $1", [now]);

  const result = await queryPostgres<{
    id: string;
    email: string;
  }>(
    `
      SELECT admin_users.id, admin_users.email
      FROM admin_sessions
      INNER JOIN admin_users ON admin_users.id = admin_sessions.admin_user_id
      WHERE admin_sessions.session_token_hash = $1
        AND admin_sessions.expires_at > $2
      LIMIT 1
    `,
    [tokenHash, now],
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    email: String(row.email),
  };
}

export async function getAdminSessionState() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return {
      configured: true,
      user: null,
      isAdmin: false,
    };
  }

  const user = await getSessionUserByToken(token);

  return {
    configured: true,
    user,
    isAdmin: Boolean(user),
  };
}

export async function requireAdminUser() {
  const sessionState = await getAdminSessionState();

  if (!sessionState.user) {
    redirect("/admin/login?error=credentials");
  }

  return sessionState.user;
}

export async function loginAdminUser(username: string, password: string) {
  if (isEnvAdminMatch(username, password)) {
    const envAdminUser = await syncEnvAdminUser();
    return createAdminSession(envAdminUser.id);
  }

  const result = await queryPostgres<{
    id: string;
    email: string;
    password_hash: string;
  }>(
    `
      SELECT id, email, password_hash
      FROM admin_users
      WHERE lower(email) = lower($1)
      LIMIT 1
    `,
    [username],
  );
  const user = result.rows[0];

  if (!user || !verifyPassword(password, String(user.password_hash))) {
    return false;
  }

  return createAdminSession(String(user.id));
}

async function createAdminSession(userId: string) {
  const sessionToken = newSessionToken();
  const sessionId = createId();
  const createdAt = nowIso();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  await queryPostgres(
    `
      INSERT INTO admin_sessions (
        id,
        admin_user_id,
        session_token_hash,
        created_at,
        expires_at
      ) VALUES ($1, $2, $3, $4, $5)
    `,
    [
      sessionId,
      userId,
      hashSessionToken(sessionToken),
      createdAt,
      expiresAt,
    ],
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
    path: "/",
  });

  return true;
}

export async function logoutAdminUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await queryPostgres(
      "DELETE FROM admin_sessions WHERE session_token_hash = $1",
      [hashSessionToken(sessionToken)],
    );
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export function assertAdminAuthenticated(userId: string | null) {
  if (!userId) {
    throw new AuthenticationAppError();
  }
}
