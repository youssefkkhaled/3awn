import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  getDonationRateLimitCount,
  getDonationRateLimitWindowMinutes,
  getUploadsPath,
} from "@/lib/env";
import { buildLatestActivity } from "@/lib/activity";
import { getDistributionDateKey } from "@/lib/date";
import { AppError, RateLimitAppError } from "@/lib/errors";
import { DEFAULT_CAMPAIGN_SLUG, DEFAULT_HERO_IMAGE_PATH } from "@/lib/seed";
import { createId, getDatabase, nowIso } from "@/lib/sqlite";
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
    acceptingDonations: Boolean(Number(row.accepting_donations)),
    logoStoragePath:
      typeof row.logo_storage_path === "string" ? row.logo_storage_path : null,
    instapayHandle: String(row.instapay_handle),
    instapayLink: String(row.instapay_link),
    vodafoneCashNumber: String(row.vodafone_cash_number),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapDonation(row: DatabaseRow): DonationRecord {
  return {
    id: String(row.id),
    idempotencyKey: String(row.idempotency_key),
    type: row.type === "amount" ? "amount" : "meals",
    status: row.status === "voided" ? "voided" : "confirmed",
    mealsCount: typeof row.meals_count === "number" ? row.meals_count : null,
    amountEGP: Number(row.amount_egp),
    distributionDate:
      typeof row.distribution_date === "string" ? row.distribution_date : null,
    createdAt: String(row.created_at),
    voidedAt: typeof row.voided_at === "string" ? row.voided_at : null,
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
    createdAt: String(row.created_at),
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
      typeof row.payload_json === "string"
        ? (JSON.parse(row.payload_json) as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at),
  };
}

export async function getCampaignSettings() {
  const row = getDatabase()
    .prepare("SELECT * FROM campaign_settings WHERE slug = ? LIMIT 1")
    .get(DEFAULT_CAMPAIGN_SLUG);

  if (!row) {
    throw new AppError(
      "CAMPAIGN_SETTINGS_MISSING",
      "تعذر العثور على إعدادات الحملة المحلية.",
      500,
    );
  }

  return mapCampaignSettings(row);
}

export async function getCampaignSnapshot(distributionDate: string) {
  const row = getDatabase()
    .prepare(
      `
        SELECT
          (
            COALESCE((
              SELECT SUM(meals_count)
              FROM donations
              WHERE status = 'confirmed'
                AND type = 'meals'
                AND distribution_date = ?
            ), 0)
            +
            COALESCE((
              SELECT SUM(delta_value)
              FROM admin_adjustments
              WHERE kind = 'meals'
                AND effective_date = ?
            ), 0)
          ) AS direct_meals,
          COALESCE((
            SELECT COUNT(*)
            FROM donations
            WHERE status = 'confirmed'
          ), 0) AS total_confirmed_donations
      `,
    )
    .get(distributionDate, distributionDate);
  const contributionRows = getDatabase()
    .prepare(
      `
        SELECT amount_egp, created_at, NULL AS effective_date
        FROM donations
        WHERE status = 'confirmed'
          AND type = 'amount'
        UNION ALL
        SELECT delta_value AS amount_egp, created_at, effective_date
        FROM admin_adjustments
        WHERE kind = 'amount'
      `,
    )
    .all();

  return {
    directMeals: Number(row?.direct_meals ?? 0),
    monthlyPoolContributions: contributionRows.map((contribution) => ({
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
  const row = getDatabase()
    .prepare("SELECT COUNT(*) AS count FROM donations WHERE status = 'confirmed'")
    .get();

  return Number(row?.count ?? 0) > 0;
}

export async function insertConfirmedDonation(input: ConfirmedDonationInsert) {
  const database = getDatabase();
  const rateLimitCount = getDonationRateLimitCount();
  const rateLimitWindowMinutes = getDonationRateLimitWindowMinutes();
  const existing = database
    .prepare("SELECT id FROM donations WHERE idempotency_key = ? LIMIT 1")
    .get(input.idempotencyKey);

  if (existing?.id) {
    return String(existing.id);
  }

  const createdAt = nowIso();
  const recentWindowStart = new Date(
    Date.now() - rateLimitWindowMinutes * 60 * 1000,
  ).toISOString();

  if (input.clientIpHash && rateLimitCount > 0) {
    const recent = database
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM donations
          WHERE client_ip_hash = ?
            AND created_at >= ?
        `,
      )
      .get(input.clientIpHash, recentWindowStart);

    if (Number(recent?.count ?? 0) >= rateLimitCount) {
      throw new RateLimitAppError();
    }
  }

  const donationId = createId();

  try {
    database
      .prepare(
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
          ) VALUES (?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
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
      );
  } catch {
    const duplicate = database
      .prepare("SELECT id FROM donations WHERE idempotency_key = ? LIMIT 1")
      .get(input.idempotencyKey);

    if (duplicate?.id) {
      return String(duplicate.id);
    }

    throw new AppError(
      "DONATION_INSERT_FAILED",
      "تعذر حفظ التبرع في قاعدة البيانات المحلية.",
      500,
    );
  }

  return donationId;
}

export async function listDonations(
  filters: DonationFilters = {},
  options: { limit?: number | null } = {},
) {
  const clauses: string[] = [];
  const params: Array<string | number> = [];
  const limit = options.limit === undefined ? 100 : options.limit;

  if (filters.type) {
    clauses.push("type = ?");
    params.push(filters.type);
  }

  if (filters.status) {
    clauses.push("status = ?");
    params.push(filters.status);
  }

  if (filters.distributionDate) {
    clauses.push("distribution_date = ?");
    params.push(filters.distributionDate);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const limitClause = typeof limit === "number" ? "LIMIT ?" : "";

  if (typeof limit === "number") {
    params.push(limit);
  }

  const rows = getDatabase()
    .prepare(
      `
        SELECT *
        FROM donations
        ${whereClause}
        ORDER BY created_at DESC
        ${limitClause}
      `,
    )
    .all(...params);

  return rows.map((row) => mapDonation(row));
}

export async function voidDonation(donationId: string, reason: string) {
  const voidedAt = nowIso();
  const result = getDatabase()
    .prepare(
      `
        UPDATE donations
        SET status = 'voided',
            voided_at = ?,
            void_reason = ?
        WHERE id = ?
          AND status = 'confirmed'
      `,
    )
    .run(voidedAt, reason, donationId);

  if (result.changes === 0) {
    throw new AppError(
      "DONATION_VOID_FAILED",
      "تعذر العثور على التبرع أو تم إلغاؤه بالفعل.",
      400,
    );
  }

  return donationId;
}

export async function createAdjustment(input: AdjustmentInsert) {
  const adjustmentId = createId();
  const createdAt = nowIso();

  getDatabase()
    .prepare(
      `
        INSERT INTO admin_adjustments (
          id,
          kind,
          delta_value,
          effective_date,
          reason,
          created_by,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      adjustmentId,
      input.kind,
      input.deltaValue,
      input.effectiveDate,
      input.reason,
      input.createdBy,
      createdAt,
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
  const rows = getDatabase()
    .prepare("SELECT * FROM admin_adjustments ORDER BY created_at DESC LIMIT 50")
    .all();

  return rows.map((row) => mapAdjustment(row));
}

export async function logAuditEvent(args: {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  payloadJson: Record<string, unknown>;
}) {
  getDatabase()
    .prepare(
      `
        INSERT INTO audit_logs (
          id,
          actor_user_id,
          action,
          entity_type,
          entity_id,
          payload_json,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      createId(),
      args.actorUserId,
      args.action,
      args.entityType,
      args.entityId,
      JSON.stringify(args.payloadJson),
      nowIso(),
    );
}

export async function listAuditLogs(limit: number | null = 20) {
  const rows =
    typeof limit === "number"
      ? getDatabase()
          .prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?")
          .all(limit)
      : getDatabase()
          .prepare("SELECT * FROM audit_logs ORDER BY created_at DESC")
          .all();

  return rows.map((row) => mapAuditLog(row));
}

export async function uploadLogoAsset(file: File) {
  const uploadsDirectory = path.join(getUploadsPath(), "logos");
  await mkdir(uploadsDirectory, { recursive: true });

  const extension = file.name.split(".").pop() || "bin";
  const fileName = `campaign-logo-${randomUUID()}.${extension}`;
  const filePath = path.join(uploadsDirectory, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(filePath, buffer);

  return `/storage/logos/${fileName}`;
}

export async function uploadReceiptAsset(file: File) {
  const uploadsDirectory = path.join(getUploadsPath(), "receipts");
  await mkdir(uploadsDirectory, { recursive: true });

  const extension = file.name.split(".").pop() || "bin";
  const fileName = `receipt-${randomUUID()}.${extension}`;
  const filePath = path.join(uploadsDirectory, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(filePath, buffer);

  return `/storage/receipts/${fileName}`;
}

export async function updateCampaignSettings(
  input: CampaignSettingsUpdate,
  lockFinancialFields: boolean,
) {
  const currentSettings = await getCampaignSettings();
  const updatedAt = nowIso();

  getDatabase()
    .prepare(
      `
        UPDATE campaign_settings
        SET campaign_name_ar = ?,
            hero_title_ar = ?,
            hero_body_ar = ?,
            meal_price_egp = ?,
            campaign_end_date = ?,
            accepting_donations = ?,
            logo_storage_path = ?,
            instapay_handle = ?,
            instapay_link = ?,
            vodafone_cash_number = ?,
            updated_at = ?
        WHERE slug = ?
      `,
    )
    .run(
      input.campaignNameAr,
      input.heroTitleAr,
      input.heroBodyAr,
      lockFinancialFields ? currentSettings.mealPriceEGP : input.mealPriceEGP,
      lockFinancialFields
        ? currentSettings.campaignEndDate
        : input.campaignEndDate,
      input.acceptingDonations ? 1 : 0,
      input.logoStoragePath,
      input.instapayHandle,
      input.instapayLink,
      input.vodafoneCashNumber,
      updatedAt,
      DEFAULT_CAMPAIGN_SLUG,
    );

  return getCampaignSettings();
}

export async function listLatestActivity() {
  const [donations, auditLogs] = await Promise.all([
    listDonations({}, { limit: null }),
    listAuditLogs(null),
  ]);

  return buildLatestActivity(donations, auditLogs);
}
