import {
  getCampaignSettings,
  getCampaignSnapshot,
  listLatestActivity,
} from "@/lib/data/store";
import { formatArabicDateLabel, getDistributionDateKey } from "@/lib/date";
import { formatArabicDateTime, formatEnglishNumber } from "@/lib/format";
import { buildPublicStats } from "@/lib/stats";
import type { LatestActivityItem } from "@/lib/types";

function isDateKey(value: string | undefined) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const settings = await getCampaignSettings();
  const currentDistributionDate = getDistributionDateKey(new Date(), settings.timezone);
  const selectedDistributionDate = isDateKey(
    typeof params.distributionDate === "string" ? params.distributionDate : undefined,
  )
    ? String(params.distributionDate)
    : currentDistributionDate;
  const snapshot = await getCampaignSnapshot(selectedDistributionDate);
  const stats = buildPublicStats(
    settings,
    snapshot,
    new Date(),
    selectedDistributionDate,
  );
  const selectedDistributionDateLabel = formatArabicDateLabel(selectedDistributionDate);
  let latestActivity: LatestActivityItem[] = [];

  try {
    latestActivity = await listLatestActivity();
  } catch {
    latestActivity = [];
  }

  return (
    <div className="grid gap-6">
      <section className="admin-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--sand-main)]">
              ملخص يوم التوزيع
            </h2>
            <p className="mt-2 text-sm text-[var(--sand-muted)]">
              {selectedDistributionDateLabel}
            </p>
          </div>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-2 text-sm text-[var(--sand-muted)]">
              تاريخ التوزيع
              <input
                className="admin-input"
                type="date"
                name="distributionDate"
                defaultValue={selectedDistributionDate}
              />
            </label>
            <button type="submit" className="admin-button">
              عرض اليوم
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="stat-card">
          <div className="text-sm text-[var(--sand-subtle)]">إجمالي وجبات اليوم المحدد</div>
          <div className="mt-3 text-4xl font-black text-[var(--sand-strong)]">
            {formatEnglishNumber(stats.totalMealsForDistributionDate)}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-[var(--sand-subtle)]">
            من الحجز المباشر
          </div>
          <div className="mt-3 text-4xl font-black text-[var(--sand-strong)]">
            {formatEnglishNumber(stats.directMeals)}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-[var(--sand-subtle)]">
            من مبلغ الشهر لليوم المحدد
          </div>
          <div className="mt-3 text-4xl font-black text-[var(--sand-strong)]">
            {formatEnglishNumber(stats.monthlyPoolMealsForDistributionDate)}
          </div>
          <div className="mt-2 text-xs text-[var(--sand-subtle)]">
            المتبقي في الصندوق يعادل{" "}
            {formatEnglishNumber(stats.monthlyPoolMealsTotal)} وجبة
          </div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-[var(--sand-subtle)]">المتبقي في مبلغ الشهر</div>
          <div className="mt-3 text-4xl font-black text-[var(--sand-strong)]">
            {formatEnglishNumber(stats.monthlyPoolEGP)}
          </div>
          <div className="mt-2 text-xs text-[var(--sand-subtle)]">
            تم صرف {formatEnglishNumber(stats.monthlyPoolSpentEGP)} من أصل{" "}
            {formatEnglishNumber(stats.monthlyPoolGrossEGP)}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-[var(--sand-subtle)]">إجمالي التبرعات المؤكدة</div>
          <div className="mt-3 text-4xl font-black text-[var(--sand-strong)]">
            {formatEnglishNumber(snapshot.totalConfirmedDonations)}
          </div>
        </div>
      </section>

      <section className="admin-card">
        <h2 className="text-xl font-bold text-[var(--sand-main)]">
          توزيع وجبات اليوم المحدد
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[rgba(255,213,142,0.18)] bg-[rgba(255,214,149,0.08)] p-4">
            <div className="text-sm text-[var(--sand-subtle)]">إجمالي الوجبات</div>
            <div className="mt-2 text-3xl font-black text-[var(--sand-strong)]">
              {formatEnglishNumber(stats.totalMealsForDistributionDate)}
            </div>
          </div>
          <div className="rounded-2xl border border-[rgba(255,213,142,0.18)] bg-[rgba(255,214,149,0.08)] p-4">
            <div className="text-sm text-[var(--sand-subtle)]">وجبات الحجز المباشر</div>
            <div className="mt-2 text-3xl font-black text-[var(--sand-strong)]">
              {formatEnglishNumber(stats.directMeals)}
            </div>
          </div>
          <div className="rounded-2xl border border-[rgba(255,213,142,0.18)] bg-[rgba(255,214,149,0.08)] p-4">
            <div className="text-sm text-[var(--sand-subtle)]">وجبات مبلغ الشهر</div>
            <div className="mt-2 text-3xl font-black text-[var(--sand-strong)]">
              {formatEnglishNumber(stats.monthlyPoolMealsForDistributionDate)}
            </div>
          </div>
        </div>
      </section>

      <section className="admin-card">
        <h2 className="text-xl font-bold text-[var(--sand-main)]">
          أحدث النشاطات
        </h2>
        <div className="mt-4 grid gap-3">
          {latestActivity.length === 0 ? (
            <div className="text-sm text-[var(--sand-muted)]">
              لا يوجد نشاط حديث بعد.
            </div>
          ) : (
            latestActivity.map((item) => (
              <div
                key={`${item.kind}-${item.id}`}
                className="rounded-2xl border border-[rgba(201,149,106,0.14)] bg-[rgba(201,149,106,0.05)] p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-semibold text-[var(--sand-main)]">
                      {item.title}
                    </div>
                    <div className="text-sm text-[var(--sand-muted)]">
                      {item.description}
                    </div>
                  </div>
                  <div className="text-xs text-[var(--sand-subtle)]">
                    {formatArabicDateTime(item.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
