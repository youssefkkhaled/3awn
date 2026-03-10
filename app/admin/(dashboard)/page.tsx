import {
  getCampaignSettings,
  getCampaignSnapshot,
  listLatestActivity,
} from "@/lib/data/store";
import { getDistributionDateKey } from "@/lib/date";
import { formatArabicDateTime, formatEnglishNumber } from "@/lib/format";
import { buildPublicStats } from "@/lib/stats";

export default async function AdminDashboardPage() {
  const settings = await getCampaignSettings();
  const snapshot = await getCampaignSnapshot(
    getDistributionDateKey(new Date(), settings.timezone),
  );
  const stats = buildPublicStats(settings, snapshot);
  const latestActivity = await listLatestActivity();

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="stat-card">
          <div className="text-sm text-[var(--sand-subtle)]">وجبات الغد المتوقعة</div>
          <div className="mt-3 text-4xl font-black text-[var(--sand-strong)]">
            {formatEnglishNumber(stats.projectedMealsTomorrow)}
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
            من مبلغ الشهر لليوم
          </div>
          <div className="mt-3 text-4xl font-black text-[var(--sand-strong)]">
            {formatEnglishNumber(stats.monthlyPoolMealsPerDay)}
          </div>
          <div className="mt-2 text-xs text-[var(--sand-subtle)]">
            {formatEnglishNumber(stats.monthlyPoolMealsTotal)} وجبة إجماليًا من
            الصندوق
          </div>
        </div>
        <div className="stat-card">
          <div className="text-sm text-[var(--sand-subtle)]">صندوق الشهر</div>
          <div className="mt-3 text-4xl font-black text-[var(--sand-strong)]">
            {formatEnglishNumber(stats.monthlyPoolEGP)}
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
          توزيع وجبات الغد
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[rgba(255,213,142,0.18)] bg-[rgba(255,214,149,0.08)] p-4">
            <div className="text-sm text-[var(--sand-subtle)]">إجمالي وجبات الغد</div>
            <div className="mt-2 text-3xl font-black text-[var(--sand-strong)]">
              {formatEnglishNumber(stats.projectedMealsTomorrow)}
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
              {formatEnglishNumber(stats.monthlyPoolMealsPerDay)}
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
