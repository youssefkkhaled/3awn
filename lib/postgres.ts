import { Pool, type PoolClient, type QueryResultRow, types } from "pg";

import {
  getAdminEmail,
  getAdminPassword,
  getDatabaseUrl,
} from "@/lib/env";
import {
  DEFAULT_CAMPAIGN_SETTINGS,
  DEFAULT_CAMPAIGN_SLUG,
  DEFAULT_TIMEZONE,
} from "@/lib/seed";
import { hashPassword, nowIso } from "@/lib/server-utils";

// Old deployments may still have `timestamp without time zone` columns.
// Parse those as UTC so historical rows don't render 2 hours behind in Egypt.
types.setTypeParser(types.builtins.TIMESTAMP, (value) => new Date(`${value}Z`));

const globalForPostgres = globalThis as typeof globalThis & {
  __iftarPostgresPool?: Pool;
  __iftarPostgresReady?: Promise<void>;
};

function getPool() {
  if (!globalForPostgres.__iftarPostgresPool) {
    globalForPostgres.__iftarPostgresPool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    });
    globalForPostgres.__iftarPostgresPool.on("connect", (client) => {
      void client.query("SET TIME ZONE 'UTC'");
    });
  }

  return globalForPostgres.__iftarPostgresPool;
}

async function ensureTimestampTzColumn(
  client: PoolClient,
  tableName: string,
  columnName: string,
) {
  const result = await client.query<{ data_type: string }>(
    `
      SELECT data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
    `,
    [tableName, columnName],
  );

  if (result.rows[0]?.data_type !== "timestamp without time zone") {
    return;
  }

  await client.query(
    `
      ALTER TABLE ${tableName}
      ALTER COLUMN ${columnName}
      TYPE TIMESTAMPTZ
      USING ${columnName} AT TIME ZONE 'UTC'
    `,
  );
}

async function initializeSchema(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS campaign_settings (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      campaign_name_ar TEXT NOT NULL,
      hero_title_ar TEXT NOT NULL,
      hero_body_ar TEXT NOT NULL,
      meal_price_egp INTEGER NOT NULL,
      campaign_end_date TEXT NOT NULL,
      timezone TEXT NOT NULL,
      accepting_donations BOOLEAN NOT NULL DEFAULT TRUE,
      logo_storage_path TEXT,
      instapay_handle TEXT NOT NULL,
      instapay_link TEXT NOT NULL,
      vodafone_cash_number TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS donations (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      meals_count INTEGER,
      amount_egp INTEGER NOT NULL,
      distribution_date TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      voided_at TIMESTAMPTZ,
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
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      admin_user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      session_token_hash TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx ON admin_sessions (expires_at);

    CREATE TABLE IF NOT EXISTS admin_adjustments (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      delta_value INTEGER NOT NULL,
      effective_date TEXT,
      reason TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL
    );
  `);

  const timestampColumns = [
    ["campaign_settings", "created_at"],
    ["campaign_settings", "updated_at"],
    ["donations", "created_at"],
    ["donations", "voided_at"],
    ["admin_users", "created_at"],
    ["admin_sessions", "created_at"],
    ["admin_sessions", "expires_at"],
    ["admin_adjustments", "created_at"],
    ["audit_logs", "created_at"],
  ] as const;

  for (const [tableName, columnName] of timestampColumns) {
    await ensureTimestampTzColumn(client, tableName, columnName);
  }
}

async function seedDatabase(client: PoolClient) {
  const now = nowIso();

  await client.query(
    `
      INSERT INTO campaign_settings (
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
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      ON CONFLICT (id) DO NOTHING
    `,
    [
      "campaign-ramadan-2026",
      DEFAULT_CAMPAIGN_SLUG,
      DEFAULT_CAMPAIGN_SETTINGS.campaignNameAr,
      DEFAULT_CAMPAIGN_SETTINGS.heroTitleAr,
      DEFAULT_CAMPAIGN_SETTINGS.heroBodyAr,
      DEFAULT_CAMPAIGN_SETTINGS.mealPriceEGP,
      DEFAULT_CAMPAIGN_SETTINGS.campaignEndDate,
      DEFAULT_TIMEZONE,
      true,
      DEFAULT_CAMPAIGN_SETTINGS.logoStoragePath,
      DEFAULT_CAMPAIGN_SETTINGS.instapayHandle,
      DEFAULT_CAMPAIGN_SETTINGS.instapayLink,
      DEFAULT_CAMPAIGN_SETTINGS.vodafoneCashNumber,
      now,
      now,
    ],
  );

  await client.query(
    `
      INSERT INTO admin_users (id, email, password_hash, created_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash
    `,
    ["local-admin", getAdminEmail(), hashPassword(getAdminPassword()), now],
  );
}

export async function ensurePostgresReady() {
  if (!globalForPostgres.__iftarPostgresReady) {
    globalForPostgres.__iftarPostgresReady = (async () => {
      const pool = getPool();
      const client = await pool.connect();

      try {
        await initializeSchema(client);
        await seedDatabase(client);
      } finally {
        client.release();
      }
    })();
  }

  await globalForPostgres.__iftarPostgresReady;
}

export async function queryPostgres<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  await ensurePostgresReady();
  return getPool().query<T>(text, values);
}

export async function withPostgresClient<T>(
  callback: (client: PoolClient) => Promise<T>,
) {
  await ensurePostgresReady();
  const client = await getPool().connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
}
