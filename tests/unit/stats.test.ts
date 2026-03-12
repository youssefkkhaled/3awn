import { describe, expect, it } from "vitest";

import { buildPublicStats } from "@/lib/stats";
import type { CampaignSettings } from "@/lib/types";

const settings: CampaignSettings = {
  id: "campaign-1",
  slug: "ramadan-2026",
  campaignNameAr: "عوّن",
  heroTitleAr: "مبادرة عوّن",
  heroBodyAr: "تفاصيل الحملة",
  mealPriceEGP: 85,
  campaignEndDate: "2026-03-20",
  timezone: "Africa/Cairo",
  acceptingDonations: true,
  logoStoragePath: null,
  instapayHandle: "seifokaib@instapay",
  instapayLink: "https://ipn.eg/example",
  vodafoneCashNumber: "01000000000",
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
};

describe("buildPublicStats", () => {
  it("allocates monthly-pool meals from the current distribution day balance", () => {
    const stats = buildPublicStats(
      settings,
      {
        directMeals: 25,
        monthlyPoolContributions: [
          {
            amountEGP: 850,
            startDistributionDate: "2026-03-13",
          },
        ],
        totalConfirmedDonations: 10,
      },
      new Date("2026-03-12T12:00:00.000Z"),
    );

    expect(stats.remainingDays).toBe(8);
    expect(stats.distributionWindowDays).toBe(8);
    expect(stats.monthlyPoolEGP).toBe(850);
    expect(stats.monthlyPoolGrossEGP).toBe(850);
    expect(stats.monthlyPoolSpentEGP).toBe(0);
    expect(stats.monthlyPoolMealsTotal).toBe(10);
    expect(stats.monthlyPoolMealsForDistributionDate).toBe(2);
    expect(stats.totalMealsForDistributionDate).toBe(27);
    expect(stats.projectedMealsTomorrow).toBe(27);
    expect(stats.campaignEnded).toBe(false);
  });

  it("reduces the remaining monthly pool after past distribution days are spent", () => {
    const stats = buildPublicStats(
      settings,
      {
        directMeals: 4,
        monthlyPoolContributions: [
          {
            amountEGP: 850,
            startDistributionDate: "2026-03-11",
          },
        ],
        totalConfirmedDonations: 10,
      },
      new Date("2026-03-12T12:00:00.000Z"),
      "2026-03-11",
    );

    expect(stats.monthlyPoolGrossEGP).toBe(850);
    expect(stats.monthlyPoolSpentEGP).toBe(170);
    expect(stats.monthlyPoolEGP).toBe(680);
    expect(stats.monthlyPoolMealsTotal).toBe(8);
    expect(stats.monthlyPoolMealsForDistributionDate).toBe(1);
    expect(stats.totalMealsForDistributionDate).toBe(5);
  });

  it("marks the campaign as ended once the inclusive remaining window reaches zero", () => {
    const stats = buildPublicStats(
      settings,
      {
        directMeals: 0,
        monthlyPoolContributions: [],
        totalConfirmedDonations: 0,
      },
      new Date("2026-03-22T12:00:00.000Z"),
    );

    expect(stats.remainingDays).toBe(0);
    expect(stats.distributionWindowDays).toBe(0);
    expect(stats.monthlyPoolEGP).toBe(0);
    expect(stats.monthlyPoolMealsTotal).toBe(0);
    expect(stats.monthlyPoolMealsForDistributionDate).toBe(0);
    expect(stats.campaignEnded).toBe(true);
  });
});
