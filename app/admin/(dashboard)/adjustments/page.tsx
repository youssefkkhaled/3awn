import { createAdjustmentAction } from "@/app/admin/actions";
import { getDistributionDateKey } from "@/lib/date";
import { getCampaignSettings, listAdjustments } from "@/lib/data/store";
import { formatArabicDateTime, formatEnglishNumber } from "@/lib/format";

export default async function AdminAdjustmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const settings = await getCampaignSettings();
  const adjustments = await listAdjustments();
  const defaultEffectiveDate = getDistributionDateKey(
    new Date(),
    settings.timezone,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
      <section className="admin-card">
        <h2 className="text-xl font-bold text-[var(--sand-main)]">إضافة تعديل يدوي</h2>
        <p className="mt-2 text-sm leading-8 text-[var(--sand-muted)]">
          استخدم هذا النموذج لتصحيح العدادات أو إضافة وجبات/مبالغ خارج التطبيق.
        </p>

        {params.success === "created" ? (
          <div className="mt-4 rounded-2xl border border-[rgba(140,201,148,0.2)] bg-[rgba(140,201,148,0.08)] p-4 text-sm text-[#cbe4cf]">
            تم إنشاء التعديل بنجاح.
          </div>
        ) : null}

        {typeof params.error === "string" ? (
          <div className="mt-4 rounded-2xl border border-[rgba(240,121,121,0.24)] bg-[rgba(240,121,121,0.08)] p-4 text-sm text-[#f6b2b2]">
            تعذر حفظ التعديل. تأكد من تعبئة الحقول المطلوبة.
          </div>
        ) : null}

        <form action={createAdjustmentAction} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm text-[var(--sand-muted)]">
            النوع
            <select className="admin-select" name="kind" defaultValue="meals">
              <option value="meals">وجبات</option>
              <option value="amount">مبلغ</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-[var(--sand-muted)]">
            القيمة
            <input
              className="admin-input"
              name="deltaValue"
              type="number"
              placeholder="مثال: 10 أو -5"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-[var(--sand-muted)]">
            تاريخ التأثير
            <input
              className="admin-input"
              name="effectiveDate"
              type="date"
              defaultValue={defaultEffectiveDate}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-[var(--sand-muted)]">
            السبب
            <textarea
              className="admin-textarea"
              name="reason"
              rows={4}
              placeholder="شرح مختصر لسبب التعديل"
              required
            />
          </label>

          <button type="submit" className="admin-button">
            حفظ التعديل
          </button>
        </form>
      </section>

      <section className="table-card overflow-x-auto">
        <h2 className="text-xl font-bold text-[var(--sand-main)]">آخر التعديلات</h2>
        <table className="admin-table mt-4 min-w-[700px]">
          <thead>
            <tr>
              <th>الوقت</th>
              <th>النوع</th>
              <th>القيمة</th>
              <th>تاريخ التأثير</th>
              <th>السبب</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-sm text-[var(--sand-muted)]">
                  لا توجد تعديلات حتى الآن.
                </td>
              </tr>
            ) : (
              adjustments.map((adjustment) => (
                <tr key={adjustment.id}>
                  <td className="text-sm text-[var(--sand-muted)]">
                    {formatArabicDateTime(adjustment.createdAt)}
                  </td>
                  <td>{adjustment.kind === "meals" ? "وجبات" : "مبلغ"}</td>
                  <td>{formatEnglishNumber(adjustment.deltaValue)}</td>
                  <td>{adjustment.effectiveDate ?? "—"}</td>
                  <td className="max-w-md text-sm text-[var(--sand-muted)]">
                    {adjustment.reason}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
