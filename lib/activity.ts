import type { AuditLogRecord, DonationRecord, LatestActivityItem } from "@/lib/types";

export function buildLatestActivity(
  donations: DonationRecord[],
  auditLogs: AuditLogRecord[],
): LatestActivityItem[] {
  return [
    ...donations.map(
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
    ...auditLogs.map(
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
