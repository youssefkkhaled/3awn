import { randomUUID } from "node:crypto";

import {
  ConfigurationError,
  getDonationRateLimitCount,
  getDonationRateLimitWindowMinutes,
  isObjectStorageConfigured,
} from "@/lib/env";
import { getDistributionDateKey } from "@/lib/date";
import { AppError, RateLimitAppError } from "@/lib/errors";
import { uploadObjectToStorage } from "@/lib/object-storage";
import { queryPostgres, withPostgresClient } from "@/lib/postgres";
import { DEFAULT_CAMPAIGN_SLUG, DEFAULT_HERO_IMAGE_PATH } from "@/lib/seed";
import { createId, nowIso } from "@/lib/server-utils";
import type {
  AdjustmentInsert,
  AdminAdjustmentRecord,
  AuditLogRecord,
  CampaignSettings,
  CampaignSettingsUpdate,
  CampaignSnapshot,
  ConfirmedDonationInsert,
  DonationFilters,
  DonationRecord,
  LatestActivityItem,
} from "@/lib/types";

type DatabaseRow = Record<string, unknown>;

function mapCampaignSettings(row: DatabaseRow): CampaignSettings {
  return {
    id: String(row.id),
    slug: String(row.slug),
    campaignNameAr: String(row.campaign_name_ar),
    heroTitleAr: String(row.hero_title_ar),
    heroBodyAr: String(row.hero_body_ar),
    mealPriceEGP: Number(row.meal_price_egp),
    campaignEndDate: String(row.campaign_end_date),
    timezone: String(row.timezone),
    acceptingDonations: Boolean(row.accepting_donations),
    logoStoragePath:
      typeof row.logo_storage_path === "string" ? row.logo_storage_path : null,
    instapayHandle: String(row.instapay_handle),
    instapayLink: String(row.instapay_link),
    vodafoneCashNumber: String(row.vodafone_cash_number),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapDonation(row: DatabaseRow): DonationRecord {
  return {
    id: String(row.id),
    idempotencyKey: String(row.idempotency_key),
    type: row.type === "amount" ? "amount" : "meals",
    status: row.status === "voided" ? "voided" : "confirmed",
    mealsCount:
      row.meals_count === null || row.meals_count === undefined
        ? null
        : Number(row.meals_count),
    amountEGP: Number(row.amount_egp),
    distributionDate:
      typeof row.distribution_date === "string" ? row.distribution_date : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    voidedAt:
      row.voided_at instanceof Date
        ? row.voided_at.toISOString()
        : typeof row.voided_at === "string"
          ? new Date(row.voided_at).toISOString()
          : null,
    voidReason: typeof row.void_reason === "string" ? row.void_reason : null,
    clientIpHash:
      typeof row.client_ip_hash === "string" ? row.client_ip_hash : null,
    userAgent: typeof row.user_agent === "string" ? row.user_agent : null,
    receiptImagePath:
      typeof row.receipt_image_path === "string"
        ? row.receipt_image_path
        : null,
  };
}

function mapAdjustment(row: DatabaseRow): AdminAdjustmentRecord {
  return {
    id: String(row.id),
    kind: row.kind === "amount" ? "amount" : "meals",
    deltaValue: Number(row.delta_value),
    effectiveDate:
      typeof row.effective_date === "string" ? row.effective_date : null,
    reason: String(row.reason),
    createdBy: String(row.created_by),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function mapAuditLog(row: DatabaseRow): AuditLogRecord {
  return {
    id: String(row.id),
    actorUserId: typeof row.actor_user_id === "string" ? row.actor_user_id : null,
    action: String(row.action),
    entityType: String(row.entity_type),
    entityId: typeof row.entity_id === "string" ? row.entity_id : null,
    payloadJson:
      typeof row.payload_json === "object" && row.payload_json !== null
        ? (row.payload_json as Record<string, unknown>)
        : {},
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function getCampaignSettings() {
  const result = await queryPostgres(
    "SELECT * FROM campaign_settings WHERE slug = $1 LIMIT 1",
    [DEFAULT_CAMPAIGN_SLUG],
  );
  const row = result.rows[0] as DatabaseRow | undefined;

  if (!row) {
    throw new AppError(
      "CAMPAIGN_SETTINGS_MISSING",
      "تعذر العثور على إعدادات الحملة.",
      500,
    );
  }

  return mapCampaignSettings(row);
}

export async function getCampaignSnapshot(distributionDate: string) {
  const result = await queryPostgres(
    `
      SELECT
        (
          COALESCE((
            SELECT SUM(meals_count)
            FROM donations
            WHERE status = 'confirmed'
              AND type = 'meals'
              AND distribution_date = $1
          ), 0)
          +
          COALESCE((
            SELECT SUM(delta_value)
            FROM admin_adjustments
            WHERE kind = 'meals'
              AND effective_date = $2
          ), 0)
        ) AS direct_meals,
        COALESCE((
          SELECT COUNT(*)
          FROM donations
          WHERE status = 'confirmed'
        ), 0) AS total_confirmed_donations
    `,
    [distributionDate, distributionDate],
  );
  const row = result.rows[0] as DatabaseRow | undefined;
  const contributionRows = await queryPostgres<{
    amount_egp: number;
    created_at: string;
    effective_date: string | null;
  }>(
    `
      SELECT amount_egp, created_at, NULL::text AS effective_date
      FROM donations
      WHERE status = 'confirmed'
        AND type = 'amount'
      UNION ALL
      SELECT delta_value AS amount_egp, created_at, effective_date
      FROM admin_adjustments
      WHERE kind = 'amount'
    `,
  );

  return {
    directMeals: Number(row?.direct_meals ?? 0),
    monthlyPoolContributions: contributionRows.rows.map((contribution) => ({
      amountEGP: Number(contribution.amount_egp),
      startDistributionDate:
        typeof contribution.effective_date === "string" &&
        contribution.effective_date.length > 0
          ? contribution.effective_date
          : getDistributionDateKey(new Date(String(contribution.created_at))),
    })),
    totalConfirmedDonations: Number(row?.total_confirmed_donations ?? 0),
  } satisfies CampaignSnapshot;
}

export async function getLogoPublicUrl(pathname: string | null) {
  return pathname || DEFAULT_HERO_IMAGE_PATH;
}

export async function hasConfirmedDonations() {
  const result = await queryPostgres(
    "SELECT COUNT(*)::int AS count FROM donations WHERE status = 'confirmed'",
  );

  return Number(result.rows[0]?.count ?? 0) > 0;
}

export async function insertConfirmedDonation(input: ConfirmedDonationInsert) {
  return withPostgresClient(async (client) => {
    const rateLimitCount = getDonationRateLimitCount();
    const rateLimitWindowMinutes = getDonationRateLimitWindowMinutes();
    const existing = await client.query(
      "SELECT id FROM donations WHERE idempotency_key = $1 LIMIT 1",
      [input.idempotencyKey],
    );

    if (existing.rows[0]?.id) {
      return String(existing.rows[0].id);
    }

    const createdAt = nowIso();
    const recentWindowStart = new Date(
      Date.now() - rateLimitWindowMinutes * 60 * 1000,
    ).toISOString();

    if (input.clientIpHash && rateLimitCount > 0) {
      const recent = await client.query(
        `
          SELECT COUNT(*)::int AS count
          FROM donations
          WHERE client_ip_hash = $1
            AND created_at >= $2
        `,
        [input.clientIpHash, recentWindowStart],
      );

      if (Number(recent.rows[0]?.count ?? 0) >= rateLimitCount) {
        throw new RateLimitAppError();
      }
    }

    const donationId = createId();

    try {
      await client.query(
        `
          INSERT INTO donations (
            id,
            idempotency_key,
            type,
            status,
            meals_count,
            amount_egp,
            distribution_date,
            created_at,
            client_ip_hash,
            user_agent,
            receipt_image_path
          ) VALUES ($1, $2, $3, 'confirmed', $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          donationId,
          input.idempotencyKey,
          input.type,
          input.mealsCount,
          input.amountEGP,
          input.distributionDate,
          createdAt,
          input.clientIpHash,
          input.userAgent,
          input.receiptImagePath,
        ],
      );
    } catch {
      const duplicate = await client.query(
        "SELECT id FROM donations WHERE idempotency_key = $1 LIMIT 1",
        [input.idempotencyKey],
      );

      if (duplicate.rows[0]?.id) {
        return String(duplicate.rows[0].id);
      }

      throw new AppError(
        "DONATION_INSERT_FAILED",
        "تعذر حفظ التبرع في قاعدة البيانات.",
        500,
      );
    }

    return donationId;
  });
}

export async function listDonations(filters: DonationFilters = {}) {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.type) {
    params.push(filters.type);
    clauses.push(`type = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status);
    clauses.push(`status = $${params.length}`);
  }

  if (filters.distributionDate) {
    params.push(filters.distributionDate);
    clauses.push(`distribution_date = $${params.length}`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await queryPostgres(
    `
      SELECT *
      FROM donations
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 100
    `,
    params,
  );

  return result.rows.map((row) => mapDonation(row as DatabaseRow));
}

export async function voidDonation(donationId: string, reason: string) {
  const result = await queryPostgres(
    `
      UPDATE donations
      SET status = 'voided',
          voided_at = $1,
          void_reason = $2
      WHERE id = $3
        AND status = 'confirmed'
      RETURNING id
    `,
    [nowIso(), reason, donationId],
  );

  if (!result.rows[0]?.id) {
    throw new AppError(
      "DONATION_VOID_FAILED",
      "تعذر العثور على التبرع أو تم إلغاؤه بالفعل.",
      400,
    );
  }

  return String(result.rows[0].id);
}

export async function createAdjustment(input: AdjustmentInsert) {
  const adjustmentId = createId();
  const createdAt = nowIso();

  await queryPostgres(
    `
      INSERT INTO admin_adjustments (
        id,
        kind,
        delta_value,
        effective_date,
        reason,
        created_by,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      adjustmentId,
      input.kind,
      input.deltaValue,
      input.effectiveDate,
      input.reason,
      input.createdBy,
      createdAt,
    ],
  );

  return {
    id: adjustmentId,
    kind: input.kind,
    deltaValue: input.deltaValue,
    effectiveDate: input.effectiveDate,
    reason: input.reason,
    createdBy: input.createdBy,
    createdAt,
  };
}

export async function listAdjustments() {
  const result = await queryPostgres(
    "SELECT * FROM admin_adjustments ORDER BY created_at DESC LIMIT 50",
  );

  return result.rows.map((row) => mapAdjustment(row as DatabaseRow));
}

export async function logAuditEvent(args: {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  payloadJson: Record<string, unknown>;
}) {
  await queryPostgres(
    `
      INSERT INTO audit_logs (
        id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        payload_json,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
    `,
    [
      createId(),
      args.actorUserId,
      args.action,
      args.entityType,
      args.entityId,
      JSON.stringify(args.payloadJson),
      nowIso(),
    ],
  );
}

export async function listAuditLogs(limit = 20) {
  const result = await queryPostgres(
    "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1",
    [limit],
  );

  return result.rows.map((row) => mapAuditLog(row as DatabaseRow));
}

export async function uploadLogoAsset(file: File) {
  if (!isObjectStorageConfigured()) {
    throw new ConfigurationError(
      "Blob or object storage is required when PostgreSQL mode is enabled.",
    );
  }

  const extension = file.name.split(".").pop() || "bin";
  const fileName = `campaign-logo-${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  return uploadObjectToStorage({
    key: `logos/${fileName}`,
    body: buffer,
    contentType: file.type || "application/octet-stream",
  });
}

export async function uploadReceiptAsset(file: File) {
  if (!isObjectStorageConfigured()) {
    throw new ConfigurationError(
      "Blob or object storage is required when PostgreSQL mode is enabled.",
    );
  }

  const extension = file.name.split(".").pop() || "bin";
  const fileName = `receipt-${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  return uploadObjectToStorage({
    key: `receipts/${fileName}`,
    body: buffer,
    contentType: file.type || "application/octet-stream",
  });
}

export async function updateCampaignSettings(
  input: CampaignSettingsUpdate,
  lockFinancialFields: boolean,
) {
  const currentSettings = await getCampaignSettings();
  const updatedAt = nowIso();

  await queryPostgres(
    `
      UPDATE campaign_settings
      SET campaign_name_ar = $1,
          hero_title_ar = $2,
          hero_body_ar = $3,
          meal_price_egp = $4,
          campaign_end_date = $5,
          accepting_donations = $6,
          logo_storage_path = $7,
          instapay_handle = $8,
          instapay_link = $9,
          vodafone_cash_number = $10,
          updated_at = $11
      WHERE slug = $12
    `,
    [
      input.campaignNameAr,
      input.heroTitleAr,
      input.heroBodyAr,
      lockFinancialFields ? currentSettings.mealPriceEGP : input.mealPriceEGP,
      lockFinancialFields
        ? currentSettings.campaignEndDate
        : input.campaignEndDate,
      input.acceptingDonations,
      input.logoStoragePath,
      input.instapayHandle,
      input.instapayLink,
      input.vodafoneCashNumber,
      updatedAt,
      DEFAULT_CAMPAIGN_SLUG,
    ],
  );

  return getCampaignSettings();
}

export async function listLatestActivity() {
  const [donations, auditLogs] = await Promise.all([
    listDonations(),
    listAuditLogs(10),
  ]);

  return [
    ...donations.slice(0, 5).map(
      (donation): LatestActivityItem => ({
        id: donation.id,
        kind: "donation",
        title:
          donation.type === "meals"
            ? "تبرع وجبات جديد"
            : "تبرع مبلغ جديد للشهر",
        description:
          donation.type === "meals"
            ? `${donation.mealsCount ?? 0} وجبة بقيمة ${donation.amountEGP} جنيه`
            : `${donation.amountEGP} جنيه لصندوق الشهر`,
        createdAt: donation.createdAt,
      }),
    ),
    ...auditLogs.slice(0, 5).map(
      (audit): LatestActivityItem => ({
        id: audit.id,
        kind: "audit",
        title: audit.action,
        description: `${audit.entityType}${audit.entityId ? ` • ${audit.entityId}` : ""}`,
        createdAt: audit.createdAt,
      }),
    ),
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
