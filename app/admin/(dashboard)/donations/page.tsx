import { voidDonationAction } from "@/app/admin/actions";
import { listDonations } from "@/lib/data/store";
import { formatArabicDateTime, formatEnglishNumber } from "@/lib/format";
import type { DonationStatus, DonationType } from "@/lib/types";

function coerceType(value: string | undefined): DonationType | undefined {
  return value === "meals" || value === "amount" ? value : undefined;
}

function coerceStatus(value: string | undefined): DonationStatus | undefined {
  return value === "confirmed" || value === "voided" ? value : undefined;
}

export default async function AdminDonationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = {
    type: coerceType(typeof params.type === "string" ? params.type : undefined),
    status: coerceStatus(
      typeof params.status === "string" ? params.status : undefined,
    ),
    distributionDate:
      typeof params.distributionDate === "string"
        ? params.distributionDate
        : undefined,
  };
  const donations = await listDonations(filters);
  const success = typeof params.success === "string" ? params.success : null;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div className="grid gap-6">
      <section className="admin-card">
        <h2 className="text-xl font-bold text-[var(--sand-main)]">التبرعات</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-4">
          <select className="admin-select" name="type" defaultValue={filters.type ?? ""}>
            <option value="">كل الأنواع</option>
            <option value="meals">وجبات</option>
            <option value="amount">مبلغ للشهر</option>
          </select>
          <select
            className="admin-select"
            name="status"
            defaultValue={filters.status ?? ""}
          >
            <option value="">كل الحالات</option>
            <option value="confirmed">مؤكد</option>
            <option value="voided">ملغي</option>
          </select>
          <input
            className="admin-input"
            type="date"
            name="distributionDate"
            defaultValue={filters.distributionDate ?? ""}
          />
          <button type="submit" className="admin-button">
            تطبيق الفلاتر
          </button>
        </form>

        {success ? (
          <div className="mt-4 rounded-2xl border border-[rgba(140,201,148,0.2)] bg-[rgba(140,201,148,0.08)] p-4 text-sm text-[#cbe4cf]">
            تم إلغاء التبرع بنجاح.
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-[rgba(240,121,121,0.24)] bg-[rgba(240,121,121,0.08)] p-4 text-sm text-[#f6b2b2]">
            تعذر إلغاء التبرع. تحقق من المدخلات ثم حاول مرة أخرى.
          </div>
        ) : null}
      </section>

      <section className="table-card overflow-x-auto">
        <table className="admin-table min-w-[1100px]">
          <thead>
            <tr>
              <th>الوقت</th>
              <th>النوع</th>
              <th>الحالة</th>
              <th>الوجبات</th>
              <th>المبلغ</th>
              <th>تاريخ التوزيع</th>
              <th>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {donations.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-sm text-[var(--sand-muted)]">
                  لا توجد تبرعات مطابقة للفلاتر الحالية.
                </td>
              </tr>
            ) : (
              donations.map((donation) => (
                <tr key={donation.id}>
                  <td className="text-sm text-[var(--sand-muted)]">
                    {formatArabicDateTime(donation.createdAt)}
                  </td>
                  <td>{donation.type === "meals" ? "وجبات" : "مبلغ للشهر"}</td>
                  <td>
                    <span className="tag-pill">
                      {donation.status === "confirmed" ? "مؤكد" : "ملغي"}
                    </span>
                  </td>
                  <td>
                    {donation.mealsCount === null
                      ? "—"
                      : formatEnglishNumber(donation.mealsCount)}
                  </td>
                  <td>{formatEnglishNumber(donation.amountEGP)} جنيه</td>
                  <td>{donation.distributionDate ?? "—"}</td>
                  <td>
                    {donation.status === "confirmed" ? (
                      <form
                        action={voidDonationAction}
                        className="flex min-w-56 flex-col gap-2"
                      >
                        <input type="hidden" name="donationId" value={donation.id} />
                        <textarea
                          className="admin-textarea"
                          name="reason"
                          rows={2}
                          placeholder="سبب الإلغاء"
                          required
                        />
                        <button type="submit" className="admin-button">
                          إلغاء التبرع
                        </button>
                      </form>
                    ) : (
                      <div className="text-sm text-[var(--sand-subtle)]">
                        {donation.voidReason || "تم الإلغاء سابقًا"}
                      </div>
                    )}
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
