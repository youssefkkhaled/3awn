import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthenticationAppError } from "@/lib/errors";
import {
  createId,
  getDatabase,
  hashSessionToken,
  newSessionToken,
  nowIso,
  verifyPassword,
} from "@/lib/sqlite";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_TTL_DAYS = 7;

interface SessionUserRow {
  id: string;
  email: string;
}

function getSessionUserByToken(token: string): SessionUserRow | null {
  const database = getDatabase();
  const tokenHash = hashSessionToken(token);
  const now = nowIso();

  database
    .prepare("DELETE FROM admin_sessions WHERE expires_at <= ?")
    .run(now);

  const row = database
    .prepare(
      `
        SELECT admin_users.id, admin_users.email
        FROM admin_sessions
        INNER JOIN admin_users ON admin_users.id = admin_sessions.admin_user_id
        WHERE admin_sessions.session_token_hash = ?
          AND admin_sessions.expires_at > ?
        LIMIT 1
      `,
    )
    .get(tokenHash, now);

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

  const user = getSessionUserByToken(token);

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
  const database = getDatabase();
  const user = database
    .prepare("SELECT id, email, password_hash FROM admin_users WHERE lower(email) = lower(?) LIMIT 1")
    .get(username);

  if (!user || !verifyPassword(password, String(user.password_hash))) {
    return false;
  }

  const sessionToken = newSessionToken();
  const sessionId = createId();
  const createdAt = nowIso();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  database
    .prepare(
      `
        INSERT INTO admin_sessions (
          id,
          admin_user_id,
          session_token_hash,
          created_at,
          expires_at
        ) VALUES (?, ?, ?, ?, ?)
      `,
    )
    .run(
      sessionId,
      String(user.id),
      hashSessionToken(sessionToken),
      createdAt,
      expiresAt,
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
    getDatabase()
      .prepare("DELETE FROM admin_sessions WHERE session_token_hash = ?")
      .run(hashSessionToken(sessionToken));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export function assertAdminAuthenticated(userId: string | null) {
  if (!userId) {
    throw new AuthenticationAppError();
  }
}
