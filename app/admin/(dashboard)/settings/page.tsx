/* eslint-disable @next/next/no-img-element */

import { updateCampaignSettingsAction } from "@/app/admin/actions";
import {
  getCampaignSettings,
  getLogoPublicUrl,
  hasConfirmedDonations,
} from "@/lib/data/store";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const settings = await getCampaignSettings();
  const locked = await hasConfirmedDonations();
  const logoUrl = await getLogoPublicUrl(settings.logoStoragePath);

  return (
    <section className="admin-card">
      <h2 className="text-xl font-bold text-[var(--sand-main)]">إعدادات الحملة</h2>
      <p className="mt-2 text-sm leading-8 text-[var(--sand-muted)]">
        هذه الإعدادات تتحكم في المحتوى الظاهر للعامة وفي بيانات الدفع.
      </p>

      {params.success === "saved" ? (
        <div className="mt-4 rounded-2xl border border-[rgba(140,201,148,0.2)] bg-[rgba(140,201,148,0.08)] p-4 text-sm text-[#cbe4cf]">
          تم حفظ الإعدادات بنجاح.
        </div>
      ) : null}

      {typeof params.error === "string" ? (
        <div className="mt-4 rounded-2xl border border-[rgba(240,121,121,0.24)] bg-[rgba(240,121,121,0.08)] p-4 text-sm text-[#f6b2b2]">
          تعذر حفظ الإعدادات. تحقق من البيانات ثم حاول مرة أخرى.
        </div>
      ) : null}

      {locked ? (
        <div className="mt-4 rounded-2xl border border-[rgba(201,149,106,0.18)] bg-[rgba(201,149,106,0.08)] p-4 text-sm leading-8 text-[var(--sand-muted)]">
          تم قفل سعر الوجبة وتاريخ نهاية الحملة لأن هناك تبرعات مؤكدة بالفعل.
        </div>
      ) : null}

      <form
        action={updateCampaignSettingsAction}
        className="mt-6 grid gap-4"
        encType="multipart/form-data"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-[var(--sand-muted)]">
            اسم المبادرة
            <input
              className="admin-input"
              name="campaignNameAr"
              defaultValue={settings.campaignNameAr}
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-[var(--sand-muted)]">
            عنوان الصفحة
            <input
              className="admin-input"
              name="heroTitleAr"
              defaultValue={settings.heroTitleAr}
              required
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm text-[var(--sand-muted)]">
          وصف الحملة
          <textarea
            className="admin-textarea"
            name="heroBodyAr"
            rows={5}
            defaultValue={settings.heroBodyAr}
            required
          />
        </label>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-[var(--sand-muted)]">
            سعر الوجبة
            <input
              className="admin-input"
              name="mealPriceEGP"
              type="number"
              defaultValue={settings.mealPriceEGP}
              disabled={locked}
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-[var(--sand-muted)]">
            نهاية الحملة
            <input
              className="admin-input"
              name="campaignEndDate"
              type="date"
              defaultValue={settings.campaignEndDate}
              disabled={locked}
              required
            />
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-[var(--sand-muted)]">
            InstaPay Handle
            <input
              className="admin-input"
              name="instapayHandle"
              defaultValue={settings.instapayHandle}
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-[var(--sand-muted)]">
            رابط InstaPay
            <input
              className="admin-input"
              name="instapayLink"
              defaultValue={settings.instapayLink}
              required
            />
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-[var(--sand-muted)]">
            رقم فودافون كاش
            <input
              className="admin-input"
              name="vodafoneCashNumber"
              defaultValue={settings.vodafoneCashNumber}
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-[var(--sand-muted)]">
            شعار/صورة الحملة
            <input className="admin-input" name="logo" type="file" accept="image/*" />
          </label>
        </div>

        <label className="flex items-center gap-3 text-sm text-[var(--sand-muted)]">
          <input
            type="checkbox"
            name="acceptingDonations"
            defaultChecked={settings.acceptingDonations}
          />
          قبول التبرعات حاليًا
        </label>

        <div className="rounded-2xl border border-[rgba(201,149,106,0.16)] bg-[rgba(201,149,106,0.05)] p-4">
          <div className="text-sm text-[var(--sand-subtle)]">الصورة الحالية</div>
          <img
            src={logoUrl}
            alt={settings.campaignNameAr}
            className="mt-3 h-36 rounded-2xl object-contain"
          />
        </div>

        <button type="submit" className="admin-button w-fit px-6">
          حفظ الإعدادات
        </button>
      </form>
    </section>
  );
}
