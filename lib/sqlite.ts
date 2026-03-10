import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  getAdminEmail,
  getAdminPassword,
  getDatabasePath,
  getSessionSecret,
} from "@/lib/env";
import {
  DEFAULT_CAMPAIGN_SETTINGS,
  DEFAULT_CAMPAIGN_SLUG,
  DEFAULT_TIMEZONE,
} from "@/lib/seed";

type SQLiteValue = string | number | null;
type SQLiteRow = Record<string, unknown>;

interface SQLiteStatement {
  get(...params: SQLiteValue[]): SQLiteRow | undefined;
  all(...params: SQLiteValue[]): SQLiteRow[];
  run(...params: SQLiteValue[]): { changes: number; lastInsertRowid: number | bigint };
}

interface SQLiteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SQLiteStatement;
}

const globalForDatabase = globalThis as typeof globalThis & {
  __ramadanMealsDatabase?: SQLiteDatabase;
};

function ensureColumn(
  database: SQLiteDatabase,
  tableName: string,
  columnName: string,
  columnDefinition: string,
) {
  const columns = database
    .prepare(`PRAGMA table_info(${tableName})`)
    .all();

  if (columns.some((column) => String(column.name) === columnName)) {
    return;
  }

  database.exec(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`,
  );
}

function initializeSchema(database: SQLiteDatabase) {
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS campaign_settings (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      campaign_name_ar TEXT NOT NULL,
      hero_title_ar TEXT NOT NULL,
      hero_body_ar TEXT NOT NULL,
      meal_price_egp INTEGER NOT NULL,
      campaign_end_date TEXT NOT NULL,
      timezone TEXT NOT NULL,
      accepting_donations INTEGER NOT NULL DEFAULT 1,
      logo_storage_path TEXT,
      instapay_handle TEXT NOT NULL,
      instapay_link TEXT NOT NULL,
      vodafone_cash_number TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS donations (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      meals_count INTEGER,
      amount_egp INTEGER NOT NULL,
      distribution_date TEXT,
      created_at TEXT NOT NULL,
      voided_at TEXT,
      void_reason TEXT,
      client_ip_hash TEXT,
      user_agent TEXT,
      receipt_image_path TEXT
    );

    CREATE INDEX IF NOT EXISTS donations_created_at_idx ON donations (created_at DESC);
    CREATE INDEX IF NOT EXISTS donations_distribution_date_idx ON donations (distribution_date);
    CREATE INDEX IF NOT EXISTS donations_client_ip_hash_idx ON donations (client_ip_hash);

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      admin_user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      session_token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx ON admin_sessions (expires_at);

    CREATE TABLE IF NOT EXISTS admin_adjustments (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      delta_value INTEGER NOT NULL,
      effective_date TEXT,
      reason TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
  `);

  ensureColumn(database, "donations", "receipt_image_path", "TEXT");
}

function seedDatabase(database: SQLiteDatabase) {
  const now = nowIso();

  database
    .prepare(
      `
        INSERT OR IGNORE INTO campaign_settings (
          id,
          slug,
          campaign_name_ar,
          hero_title_ar,
          hero_body_ar,
          meal_price_egp,
          campaign_end_date,
          timezone,
          accepting_donations,
          logo_storage_path,
          instapay_handle,
          instapay_link,
          vodafone_cash_number,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      "campaign-ramadan-2026",
      DEFAULT_CAMPAIGN_SLUG,
      DEFAULT_CAMPAIGN_SETTINGS.campaignNameAr,
      DEFAULT_CAMPAIGN_SETTINGS.heroTitleAr,
      DEFAULT_CAMPAIGN_SETTINGS.heroBodyAr,
      DEFAULT_CAMPAIGN_SETTINGS.mealPriceEGP,
      DEFAULT_CAMPAIGN_SETTINGS.campaignEndDate,
      DEFAULT_TIMEZONE,
      1,
      DEFAULT_CAMPAIGN_SETTINGS.logoStoragePath,
      DEFAULT_CAMPAIGN_SETTINGS.instapayHandle,
      DEFAULT_CAMPAIGN_SETTINGS.instapayLink,
      DEFAULT_CAMPAIGN_SETTINGS.vodafoneCashNumber,
      now,
      now,
    );

  database
    .prepare(
      `
        INSERT INTO admin_users (id, email, password_hash, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          password_hash = excluded.password_hash
      `,
    )
    .run(
      "local-admin",
      getAdminEmail(),
      hashPassword(getAdminPassword()),
      now,
    );
}

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

export function getDatabase() {
  let database = globalForDatabase.__ramadanMealsDatabase;

  if (!database) {
    const databasePath = getDatabasePath();
    const databaseDirectory = path.dirname(databasePath);

    if (!existsSync(databaseDirectory)) {
      mkdirSync(databaseDirectory, { recursive: true });
    }

    database = new DatabaseSync(databasePath) as unknown as SQLiteDatabase;
    initializeSchema(database);
    seedDatabase(database);
    globalForDatabase.__ramadanMealsDatabase = database;
  }

  return database;
}
