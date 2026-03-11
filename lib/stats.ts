import {
  formatArabicDateLabel,
  getDistributionDateKey,
  getDistributionWindowDays,
  getRemainingDays,
} from "@/lib/date";
import { DEFAULT_HERO_IMAGE_PATH } from "@/lib/seed";
import type {
  CampaignSettings,
  CampaignSnapshot,
  PublicStats,
  PublicStatsPayload,
} from "@/lib/types";

export function getMonthlyPoolMealsTotal(
  monthlyPoolEGP: number,
  mealPriceEGP: number,
) {
  if (mealPriceEGP <= 0) {
    return 0;
  }

  return Math.max(0, Math.floor(monthlyPoolEGP / mealPriceEGP));
}

export function getRoundRobinMealsForDayOffset(
  totalMeals: number,
  distributionWindowDays: number,
  dayOffset = 0,
) {
  if (totalMeals <= 0 || distributionWindowDays <= 0) {
    return 0;
  }

  const normalizedOffset =
    ((dayOffset % distributionWindowDays) + distributionWindowDays) %
    distributionWindowDays;
  const baseMealsPerDay = Math.floor(totalMeals / distributionWindowDays);
  const remainderMeals = totalMeals % distributionWindowDays;

  return baseMealsPerDay + (normalizedOffset < remainderMeals ? 1 : 0);
}

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
  const distributionWindowDays = getDistributionWindowDays(
    settings.campaignEndDate,
    now,
    settings.timezone,
  );
  const monthlyPoolMealsTotal = getMonthlyPoolMealsTotal(
    snapshot.monthlyPoolEGP,
    settings.mealPriceEGP,
  );
  const monthlyPoolMealsForDistributionDate = getRoundRobinMealsForDayOffset(
    monthlyPoolMealsTotal,
    distributionWindowDays,
  );

  return {
    distributionDate,
    distributionDateLabel: formatArabicDateLabel(distributionDate),
    mealPriceEGP: settings.mealPriceEGP,
    remainingDays,
    distributionWindowDays,
    directMeals: snapshot.directMeals,
    monthlyPoolEGP: snapshot.monthlyPoolEGP,
    monthlyPoolMealsTotal,
    monthlyPoolMealsForDistributionDate,
    projectedMealsTomorrow:
      snapshot.directMeals + monthlyPoolMealsForDistributionDate,
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
