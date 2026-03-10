import { beforeEach, describe, expect, it, vi } from "vitest";

import { ValidationAppError } from "@/lib/errors";
import type { CampaignSettings } from "@/lib/types";

const getCampaignSettingsMock = vi.fn();
const getCampaignSnapshotMock = vi.fn();
const insertConfirmedDonationMock = vi.fn();

vi.mock("@/lib/data/store", () => ({
  getCampaignSettings: getCampaignSettingsMock,
  getCampaignSnapshot: getCampaignSnapshotMock,
  insertConfirmedDonation: insertConfirmedDonationMock,
}));

const { createDonation } = await import("@/lib/donations");

const baseSettings: CampaignSettings = {
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

describe("createDonation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getCampaignSettingsMock.mockResolvedValue(baseSettings);
    getCampaignSnapshotMock
      .mockResolvedValueOnce({
        directMeals: 3,
        monthlyPoolEGP: 850,
        totalConfirmedDonations: 1,
      })
      .mockResolvedValueOnce({
        directMeals: 5,
        monthlyPoolEGP: 850,
        totalConfirmedDonations: 2,
      });
    insertConfirmedDonationMock.mockResolvedValue("donation-1");
  });

  it("rejects amount donations only when the amount is zero or missing", async () => {
    await expect(
      createDonation(
        {
          idempotencyKey: "11111111-1111-4111-8111-111111111111",
          type: "amount",
          amountEGP: 0,
          turnstileToken: "dev-bypass",
          receiptImagePath: "/uploads/receipts/test-1.png",
        },
        {
          clientIp: "127.0.0.1",
          clientIpHash: "hash",
          userAgent: "Vitest",
          verifyTurnstile: vi.fn().mockResolvedValue({ success: true }),
        },
      ),
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("rejects donations once the campaign has ended", async () => {
    getCampaignSettingsMock.mockResolvedValue({
      ...baseSettings,
      campaignEndDate: "2026-03-01",
    });

    await expect(
      createDonation(
        {
          idempotencyKey: "22222222-2222-4222-8222-222222222222",
          type: "meals",
          mealsCount: 1,
          turnstileToken: "dev-bypass",
          receiptImagePath: "/uploads/receipts/test-2.png",
        },
        {
          clientIp: "127.0.0.1",
          clientIpHash: "hash",
          userAgent: "Vitest",
          now: new Date("2026-03-10T12:00:00.000Z"),
          verifyTurnstile: vi.fn().mockResolvedValue({ success: true }),
        },
      ),
    ).rejects.toMatchObject({
      code: "CAMPAIGN_ENDED",
    });
  });

  it("rejects the request when Turnstile verification fails", async () => {
    await expect(
      createDonation(
        {
          idempotencyKey: "33333333-3333-4333-8333-333333333333",
          type: "meals",
          mealsCount: 2,
          turnstileToken: "bad-token",
          receiptImagePath: "/uploads/receipts/test-3.png",
        },
        {
          clientIp: "127.0.0.1",
          clientIpHash: "hash",
          userAgent: "Vitest",
          verifyTurnstile: vi.fn().mockResolvedValue({ success: false }),
        },
      ),
    ).rejects.toMatchObject({
      code: "TURNSTILE_FAILED",
    });
  });

  it("normalizes a meals donation and returns refreshed shared stats", async () => {
    const response = await createDonation(
      {
        idempotencyKey: "44444444-4444-4444-8444-444444444444",
        type: "meals",
        mealsCount: 2,
        turnstileToken: "dev-bypass",
        receiptImagePath: "/uploads/receipts/test-4.png",
      },
      {
        clientIp: "127.0.0.1",
        clientIpHash: "hash",
        userAgent: "Vitest",
        now: new Date("2026-03-10T12:00:00.000Z"),
        verifyTurnstile: vi.fn().mockResolvedValue({ success: true }),
      },
    );

    expect(insertConfirmedDonationMock).toHaveBeenCalledWith({
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      type: "meals",
      mealsCount: 2,
      amountEGP: 170,
      distributionDate: "2026-03-11",
      clientIpHash: "hash",
      userAgent: "Vitest",
      receiptImagePath: "/uploads/receipts/test-4.png",
    });
    expect(response.donationId).toBe("donation-1");
    expect(response.stats.directMeals).toBe(5);
    expect(response.stats.projectedMealsTomorrow).toBe(6);
  });
});
