import { AppError, ValidationAppError } from "@/lib/errors";
import { getDistributionDateKey } from "@/lib/date";
import {
  getCampaignSettings,
  getCampaignSnapshot,
  insertConfirmedDonation,
} from "@/lib/data/store";
import { buildPublicStats } from "@/lib/stats";
import type { CreateDonationRequest, CreateDonationResponse } from "@/lib/types";
import { createDonationRequestSchema } from "@/lib/validation";

interface CreateDonationOptions {
  clientIp: string | null;
  clientIpHash: string | null;
  userAgent: string | null;
  now?: Date;
  verifyTurnstile: (
    token: string,
    clientIp: string | null,
  ) => Promise<{ success: boolean }>;
}

export async function createDonation(
  input: CreateDonationRequest,
  options: CreateDonationOptions,
): Promise<CreateDonationResponse> {
  const parsedInput = createDonationRequestSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new ValidationAppError(
      parsedInput.error.issues[0]?.message || "بيانات التبرع غير صحيحة.",
    );
  }

  const settings = await getCampaignSettings();
  const distributionDate = getDistributionDateKey(options.now, settings.timezone);
  const currentSnapshot = await getCampaignSnapshot(distributionDate);
  const currentStats = buildPublicStats(settings, currentSnapshot, options.now);

  if (currentStats.campaignEnded) {
    throw new AppError(
      "CAMPAIGN_ENDED",
      "انتهت الحملة الحالية ولم يعد التبرع متاحًا.",
      400,
    );
  }

  if (!settings.acceptingDonations) {
    throw new AppError(
      "DONATIONS_DISABLED",
      "التبرعات متوقفة مؤقتًا من الإدارة.",
      400,
    );
  }

  const verification = await options.verifyTurnstile(
    parsedInput.data.turnstileToken,
    options.clientIp,
  );

  if (!verification.success) {
    throw new AppError(
      "TURNSTILE_FAILED",
      "تعذر التحقق من الطلب. حاول مرة أخرى.",
      400,
    );
  }

  const amountEGP =
    parsedInput.data.type === "meals"
      ? (parsedInput.data.mealsCount ?? 0) * settings.mealPriceEGP
      : parsedInput.data.amountEGP ?? 0;

  const donationId = await insertConfirmedDonation({
    idempotencyKey: parsedInput.data.idempotencyKey,
    type: parsedInput.data.type,
    mealsCount:
      parsedInput.data.type === "meals"
        ? parsedInput.data.mealsCount ?? null
        : null,
    amountEGP,
    distributionDate:
      parsedInput.data.type === "meals" ? distributionDate : null,
    clientIpHash: options.clientIpHash,
    userAgent: options.userAgent,
    receiptImagePath: parsedInput.data.receiptImagePath ?? null,
  });

  const refreshedSnapshot = await getCampaignSnapshot(currentStats.distributionDate);

  return {
    donationId,
    stats: buildPublicStats(settings, refreshedSnapshot, options.now),
  };
}
