import {
  addDaysToDateKey,
  getDateKeyDifference,
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

export function getMonthlyPoolMealsTotal(
  monthlyPoolEGP: number,
  mealPriceEGP: number,
) {
  if (mealPriceEGP <= 0) {
    return 0;
  }

  return Math.max(0, Math.floor(monthlyPoolEGP / mealPriceEGP));
}

export function getDistributionWindowDaysFromDate(
  distributionDate: string,
  campaignEndDate: string,
) {
  return Math.max(0, getDateKeyDifference(distributionDate, campaignEndDate) + 1);
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

export function getMonthlyPoolGrossEGP(
  contributions: CampaignSnapshot["monthlyPoolContributions"],
) {
  return contributions.reduce(
    (total, contribution) => total + contribution.amountEGP,
    0,
  );
}

function groupMonthlyPoolContributions(
  contributions: CampaignSnapshot["monthlyPoolContributions"],
) {
  const grouped = new Map<string, number>();

  for (const contribution of contributions) {
    grouped.set(
      contribution.startDistributionDate,
      (grouped.get(contribution.startDistributionDate) ?? 0) +
        contribution.amountEGP,
    );
  }

  return grouped;
}

export function getMonthlyPoolBalanceAtStartOfDistributionDate(args: {
  contributions: CampaignSnapshot["monthlyPoolContributions"];
  mealPriceEGP: number;
  campaignEndDate: string;
  distributionDate: string;
}) {
  const relevantContributions = args.contributions
    .filter(
      (contribution) =>
        contribution.amountEGP !== 0 &&
        contribution.startDistributionDate <= args.campaignEndDate,
    )
    .sort((left, right) =>
      left.startDistributionDate.localeCompare(right.startDistributionDate),
    );

  if (
    relevantContributions.length === 0 ||
    args.distributionDate > args.campaignEndDate ||
    args.distributionDate < relevantContributions[0].startDistributionDate
  ) {
    return 0;
  }

  const contributionsByDate = groupMonthlyPoolContributions(relevantContributions);
  let balanceEGP = 0;

  for (
    let currentDate = relevantContributions[0].startDistributionDate;
    currentDate <= args.distributionDate && currentDate <= args.campaignEndDate;
    currentDate = addDaysToDateKey(currentDate, 1)
  ) {
    balanceEGP += contributionsByDate.get(currentDate) ?? 0;

    if (currentDate === args.distributionDate) {
      return balanceEGP;
    }

    const mealsForCurrentDate = getRoundRobinMealsForDayOffset(
      getMonthlyPoolMealsTotal(balanceEGP, args.mealPriceEGP),
      getDistributionWindowDaysFromDate(currentDate, args.campaignEndDate),
    );

    balanceEGP -= mealsForCurrentDate * args.mealPriceEGP;
  }

  return balanceEGP;
}

export function buildPublicStats(
  settings: CampaignSettings,
  snapshot: CampaignSnapshot,
  now = new Date(),
  selectedDistributionDate?: string,
): PublicStats {
  const remainingDays = getRemainingDays(
    settings.campaignEndDate,
    now,
    settings.timezone,
  );
  const currentDistributionDate = getDistributionDateKey(now, settings.timezone);
  const distributionDate = selectedDistributionDate ?? currentDistributionDate;
  const distributionWindowDays = getDistributionWindowDaysFromDate(
    distributionDate,
    settings.campaignEndDate,
  );
  const monthlyPoolGrossEGP = getMonthlyPoolGrossEGP(
    snapshot.monthlyPoolContributions,
  );
  const monthlyPoolEGP = getMonthlyPoolBalanceAtStartOfDistributionDate({
    contributions: snapshot.monthlyPoolContributions,
    mealPriceEGP: settings.mealPriceEGP,
    campaignEndDate: settings.campaignEndDate,
    distributionDate: currentDistributionDate,
  });
  const monthlyPoolBalanceForDistributionDate =
    getMonthlyPoolBalanceAtStartOfDistributionDate({
      contributions: snapshot.monthlyPoolContributions,
      mealPriceEGP: settings.mealPriceEGP,
      campaignEndDate: settings.campaignEndDate,
      distributionDate,
    });
  const monthlyPoolSpentEGP = monthlyPoolGrossEGP - monthlyPoolEGP;
  const monthlyPoolMealsTotal = getMonthlyPoolMealsTotal(
    monthlyPoolEGP,
    settings.mealPriceEGP,
  );
  const monthlyPoolMealsForDistributionDate = getRoundRobinMealsForDayOffset(
    getMonthlyPoolMealsTotal(
      monthlyPoolBalanceForDistributionDate,
      settings.mealPriceEGP,
    ),
    distributionWindowDays,
  );
  const totalMealsForDistributionDate =
    snapshot.directMeals + monthlyPoolMealsForDistributionDate;

  return {
    distributionDate,
    distributionDateLabel: formatArabicDateLabel(distributionDate),
    mealPriceEGP: settings.mealPriceEGP,
    remainingDays,
    distributionWindowDays,
    directMeals: snapshot.directMeals,
    monthlyPoolEGP,
    monthlyPoolGrossEGP,
    monthlyPoolSpentEGP,
    monthlyPoolMealsTotal,
    monthlyPoolMealsForDistributionDate,
    totalMealsForDistributionDate,
    projectedMealsTomorrow: totalMealsForDistributionDate,
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
