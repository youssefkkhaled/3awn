import { describe, expect, it } from "vitest";

import { buildLatestActivity } from "@/lib/activity";

describe("buildLatestActivity", () => {
  it("keeps every donation and audit log entry in reverse chronological order", () => {
    const donations = Array.from({ length: 6 }, (_, index) => ({
      id: `donation-${index + 1}`,
      idempotencyKey: `key-${index + 1}`,
      type: "meals" as const,
      status: "confirmed" as const,
      mealsCount: index + 1,
      amountEGP: (index + 1) * 85,
      distributionDate: "2026-03-14",
      createdAt: `2026-03-14T10:0${index}:00.000Z`,
      voidedAt: null,
      voidReason: null,
      clientIpHash: null,
      userAgent: null,
      receiptImagePath: null,
    }));
    const auditLogs = Array.from({ length: 6 }, (_, index) => ({
      id: `audit-${index + 1}`,
      actorUserId: "admin-1",
      action: `action-${index + 1}`,
      entityType: "donation",
      entityId: `entity-${index + 1}`,
      payloadJson: {},
      createdAt: `2026-03-14T11:0${index}:00.000Z`,
    }));

    const activity = buildLatestActivity(donations, auditLogs);

    expect(activity).toHaveLength(12);
    expect(activity[0]).toMatchObject({
      id: "audit-6",
      kind: "audit",
    });
    expect(activity[5]).toMatchObject({
      id: "audit-1",
      kind: "audit",
    });
    expect(activity[6]).toMatchObject({
      id: "donation-6",
      kind: "donation",
    });
    expect(activity[11]).toMatchObject({
      id: "donation-1",
      kind: "donation",
    });
  });
});
