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
  it("allocates monthly-pool meals in a round-robin cycle that starts with the current distribution day", () => {
    const stats = buildPublicStats(
      settings,
      {
        directMeals: 25,
        monthlyPoolEGP: 850,
        totalConfirmedDonations: 10,
      },
      new Date("2026-03-12T12:00:00.000Z"),
    );

    expect(stats.remainingDays).toBe(8);
    expect(stats.distributionWindowDays).toBe(8);
    expect(stats.monthlyPoolMealsTotal).toBe(10);
    expect(stats.monthlyPoolMealsForDistributionDate).toBe(2);
    expect(stats.projectedMealsTomorrow).toBe(27);
    expect(stats.campaignEnded).toBe(false);
  });

  it("marks the campaign as ended once the inclusive remaining window reaches zero", () => {
    const stats = buildPublicStats(
      settings,
      {
        directMeals: 0,
        monthlyPoolEGP: 0,
        totalConfirmedDonations: 0,
      },
      new Date("2026-03-22T12:00:00.000Z"),
    );

    expect(stats.remainingDays).toBe(0);
    expect(stats.distributionWindowDays).toBe(0);
    expect(stats.monthlyPoolMealsTotal).toBe(0);
    expect(stats.monthlyPoolMealsForDistributionDate).toBe(0);
    expect(stats.campaignEnded).toBe(true);
  });
});
