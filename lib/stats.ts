import {
  formatArabicDateLabel,
  getDistributionDateKey,
  getRemainingDays,
} from "@/lib/date";
import { DEFAULT_HERO_IMAGE_PATH } from "@/lib/seed";
import type {
  CampaignSettings,
  CampaignSnapshot,
  PublicStats,
  PublicStatsPayload,
} from "@/lib/types";

export function buildPublicStats(
  settings: CampaignSettings,
  snapshot: CampaignSnapshot,
  now = new Date(),
): PublicStats {
  const remainingDays = getRemainingDays(
    settings.campaignEndDate,
    now,
    settings.timezone,
  );
  const distributionDate = getDistributionDateKey(now, settings.timezone);
  const monthlyPoolMealsTotal = Math.floor(
    snapshot.monthlyPoolEGP / settings.mealPriceEGP,
  );
  const monthlyPoolMealsPerDay =
    remainingDays > 0
      ? Math.floor(monthlyPoolMealsTotal / remainingDays)
      : 0;

  return {
    distributionDate,
    distributionDateLabel: formatArabicDateLabel(distributionDate),
    mealPriceEGP: settings.mealPriceEGP,
    remainingDays,
    directMeals: snapshot.directMeals,
    monthlyPoolEGP: snapshot.monthlyPoolEGP,
    monthlyPoolMealsTotal,
    monthlyPoolMealsPerDay,
    projectedMealsTomorrow: snapshot.directMeals + monthlyPoolMealsPerDay,
    campaignEnded: remainingDays === 0,
    acceptingDonations: settings.acceptingDonations,
  };
}

export function buildPublicStatsPayload(args: {
  settings: CampaignSettings;
  snapshot: CampaignSnapshot;
  logoUrl?: string | null;
  turnstileSiteKey: string | null;
  now?: Date;
}): PublicStatsPayload {
  const stats = buildPublicStats(args.settings, args.snapshot, args.now);

  return {
    stats,
    campaign: {
      campaignNameAr: args.settings.campaignNameAr,
      heroTitleAr: args.settings.heroTitleAr,
      heroBodyAr: args.settings.heroBodyAr,
      logoUrl: args.logoUrl || DEFAULT_HERO_IMAGE_PATH,
    },
    payment: {
      instapayHandle: args.settings.instapayHandle,
      instapayLink: args.settings.instapayLink,
      vodafoneCashNumber: args.settings.vodafoneCashNumber,
    },
    turnstileSiteKey: args.turnstileSiteKey,
  };
}
