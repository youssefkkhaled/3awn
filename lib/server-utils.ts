import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

import { getSessionSecret } from "@/lib/env";

export function nowIso(date = new Date()) {
  return date.toISOString();
}

export function createId() {
  return randomUUID();
}

export function newSessionToken() {
  return `${randomUUID()}${randomBytes(16).toString("hex")}`;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, hash] = storedHash.split(":");

  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const derived = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");

  if (derived.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(derived, stored);
}

export function hashSessionToken(token: string) {
  return createHash("sha256")
    .update(`${getSessionSecret()}:${token}`)
    .digest("hex");
}
