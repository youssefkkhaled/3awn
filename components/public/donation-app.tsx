/* eslint-disable @next/next/no-img-element */
"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useState,
} from "react";

import { SetupPanel } from "@/components/public/setup-panel";
import { TurnstileWidget } from "@/components/public/turnstile-widget";
import { formatEnglishNumber } from "@/lib/format";
import {
  getMonthlyPoolMealsTotal,
  getRoundRobinMealsForDayOffset,
} from "@/lib/stats";
import type { DonationType, PublicStatsPayload } from "@/lib/types";

type ScreenState = "home" | "choose" | "confirm" | "done";

const sparkles = Array.from({ length: 22 }, (_, index) => ({
  id: index,
  size: 1 + ((index * 7) % 3),
  top: (index * 37) % 100,
  left: (index * 23) % 100,
  duration: 2 + ((index * 5) % 3),
  delay: (index * 11) % 4,
}));

export function DonationApp() {
  const [screenState, setScreenState] = useState<ScreenState>("home");
  const [donationType, setDonationType] = useState<DonationType | null>(null);
  const [mealCount, setMealCount] = useState(1);
  const [amountEGP, setAmountEGP] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [statsPayload, setStatsPayload] = useState<PublicStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const deferredAmount = useDeferredValue(amountEGP);
  const parsedAmount = Number(deferredAmount || 0);
  const mealPrice = statsPayload?.stats.mealPriceEGP ?? 85;
  const totalMeals =
    donationType === "meals"
      ? mealCount
      : getMonthlyPoolMealsTotal(parsedAmount, mealPrice);
  const totalAmount =
    donationType === "meals" ? mealCount * mealPrice : parsedAmount;
  const amountMealsForDistributionDate =
    statsPayload && donationType === "amount"
      ? getRoundRobinMealsForDayOffset(
          totalMeals,
          statsPayload.stats.distributionWindowDays,
        )
      : 0;
  const totalMealsTomorrow = statsPayload?.stats.projectedMealsTomorrow ?? 0;
  const totalMealsTomorrowAfterMyDonation =
    donationType === "meals"
      ? totalMealsTomorrow + mealCount
      : donationType === "amount"
        ? totalMealsTomorrow + amountMealsForDistributionDate
        : totalMealsTomorrow;
  const canDonate = Boolean(
    statsPayload &&
      !statsPayload.stats.campaignEnded &&
      statsPayload.stats.acceptingDonations,
  );

  const resetDonationFlow = () => {
    setDonationType(null);
    setMealCount(1);
    setAmountEGP("");
    setTurnstileToken("");
    setTurnstileResetKey((current) => current + 1);
    setValidationError(null);
  };

  const loadStats = useEffectEvent(async () => {
    setLoading(true);
    setRequestError(null);

    try {
      const response = await fetch("/api/stats", {
        cache: "no-store",
      });
      const payload = (await response.json()) as
        | PublicStatsPayload
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload
            ? payload.error || "تعذر تحميل بيانات الحملة."
            : "تعذر تحميل بيانات الحملة.",
        );
      }

      startTransition(() => {
        setStatsPayload(payload as PublicStatsPayload);
      });
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "تعذر تحميل بيانات الحملة.",
      );
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    void loadStats();
  }, []);

  const continueToConfirmation = () => {
    setValidationError(null);

    if (!donationType) {
      setValidationError("اختر طريقة التبرع أولاً.");
      return;
    }

    if (donationType === "meals" && mealCount < 1) {
      setValidationError("الحد الأدنى وجبة واحدة.");
      return;
    }

    if (donationType === "amount") {
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        setValidationError("أدخل مبلغًا أكبر من صفر.");
        return;
      }
    }

    setScreenState("confirm");
  };

  const submitDonation = async () => {
    if (!donationType || !statsPayload) {
      return;
    }

    if (!turnstileToken) {
      setValidationError("أكمل التحقق أولاً قبل تأكيد التبرع.");
      return;
    }

    setSubmitting(true);
    setValidationError(null);

    try {
      const formData = new FormData();
      formData.set("idempotencyKey", crypto.randomUUID());
      formData.set("type", donationType);
      formData.set("turnstileToken", turnstileToken);

      if (donationType === "meals") {
        formData.set("mealsCount", String(mealCount));
      }

      if (donationType === "amount") {
        formData.set("amountEGP", String(parsedAmount));
      }

      const response = await fetch("/api/donations", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as
        | { donationId: string; stats: PublicStatsPayload["stats"] }
        | { error?: string };

      if (!response.ok || !("stats" in payload)) {
        throw new Error(
          "error" in payload
            ? payload.error || "تعذر تسجيل التبرع."
            : "تعذر تسجيل التبرع.",
        );
      }

      startTransition(() => {
        setStatsPayload((current) =>
          current
            ? {
                ...current,
                stats: payload.stats,
              }
            : current,
        );
        setScreenState("done");
      });
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : "تعذر تسجيل التبرع.",
      );
      setTurnstileToken("");
      setTurnstileResetKey((current) => current + 1);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="donation-shell">
        <div className="glass-card mx-auto flex w-full max-w-xl items-center justify-center py-16 text-center">
          <div className="text-5xl font-black tracking-wide text-[var(--sand-strong)]">
            ···
          </div>
        </div>
      </main>
    );
  }

  if (!statsPayload || requestError) {
    return (
      <main className="donation-shell">
        <SetupPanel
          description={
            requestError ||
            "تعذر تحميل بيانات الحملة من قاعدة البيانات المحلية."
          }
        />
      </main>
    );
  }

  const distributionLabel = statsPayload.stats.distributionDateLabel;

  return (
    <main className="donation-shell">
      <div className="absolute inset-0 -z-10">
        {sparkles.map((sparkle) => (
          <span
            key={sparkle.id}
            className="sparkle-dot"
            style={{
              width: sparkle.size,
              height: sparkle.size,
              top: `${sparkle.top}%`,
              left: `${sparkle.left}%`,
              animationDuration: `${sparkle.duration}s`,
              animationDelay: `${sparkle.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        {screenState === "home" && (
          <>
            <div className="flex justify-center">
              <img
                src={statsPayload.campaign.logoUrl}
                alt={statsPayload.campaign.campaignNameAr}
                className="h-[220px] w-[220px] rounded-[28px] object-contain"
              />
            </div>

            <section className="glass-card text-center">
              <div className="text-xs text-[var(--sand-faint)]">
                إجمالي وجبات الغد
              </div>
              <div className="mb-2 text-[11px] text-[var(--sand-subtle)]">
                {distributionLabel}
              </div>
              <span className="meal-counter">
                {formatEnglishNumber(totalMealsTomorrow)}
              </span>
              <div className="mt-2 text-sm font-semibold text-[var(--sand-strong)]">
                وجبة إفطار
              </div>
              <div className="divider" />
              <div className="text-xs text-[var(--sand-muted)]">
                يشمل الحجز المباشر ومساهمة مبلغ الشهر لكل يوم
              </div>
            </section>

            <section className="glass-card text-right text-sm leading-8 text-[var(--sand-main)]">
              <div className="mb-3 text-lg font-bold text-[var(--sand-strong)]">
                {statsPayload.campaign.heroTitleAr}
              </div>
              <p className="text-[15px] leading-9 text-[var(--sand-muted)]">
                {statsPayload.campaign.heroBodyAr}
              </p>
              <div className="divider" />
              <div className="flex flex-wrap gap-2">
                <div className="tag-pill">
                  سعر الوجبة {formatEnglishNumber(statsPayload.stats.mealPriceEGP)}{" "}
                  جنيه
                </div>
                <div className="tag-pill">
                  المتبقي {formatEnglishNumber(statsPayload.stats.remainingDays)} يوم
                </div>
              </div>
            </section>

            {statsPayload.stats.campaignEnded ? (
              <section className="glass-card text-center">
                <div className="text-3xl">🌙</div>
                <h2 className="mt-3 text-2xl font-bold text-[var(--sand-strong)]">
                  اكتملت الحملة
                </h2>
                <p className="mt-3 text-sm leading-8 text-[var(--sand-muted)]">
                  انتهت حملة رمضان 2026. يمكنك تحديث تاريخ الحملة من لوحة الإدارة
                  عند الحاجة.
                </p>
              </section>
            ) : statsPayload.stats.acceptingDonations ? (
              <button
                type="button"
                className="btn-gold"
                onClick={() => setScreenState("choose")}
              >
                🤲 تبرع الآن
              </button>
            ) : (
              <section className="glass-card text-center text-sm leading-8 text-[var(--sand-muted)]">
                التبرعات متوقفة مؤقتًا من لوحة الإدارة. يمكنك إعادة تفعيلها من
                صفحة الإعدادات.
              </section>
            )}
          </>
        )}

        {screenState === "choose" && (
          <section className="glass-card flex flex-col gap-5">
            <button
              type="button"
              className="text-right text-sm font-semibold text-[var(--sand-strong)]"
              onClick={() => setScreenState("home")}
            >
              ← رجوع
            </button>

            <div>
              <h2 className="text-2xl font-bold text-[var(--sand-main)]">
                اختر طريقة تبرعك
              </h2>
              <p className="mt-2 text-sm text-[var(--sand-muted)]">
                كل وجبة بـ {formatEnglishNumber(mealPrice)} جنيه
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className={`mode-card ${donationType === "meals" ? "active" : ""}`}
                onClick={() => setDonationType("meals")}
              >
                <div className="text-3xl">🍱</div>
                <div className="mt-2 text-base font-bold">وجبات للغد</div>
                <div className="mt-1 text-xs text-[var(--sand-muted)]">
                  تحدد العدد وتوزَّع مباشرةً
                </div>
                <div className="mt-2 text-xs text-[var(--sand-strong)]">
                  {distributionLabel}
                </div>
              </button>

              <button
                type="button"
                className={`mode-card ${donationType === "amount" ? "active" : ""}`}
                onClick={() => setDonationType("amount")}
              >
                <div className="text-3xl">💛</div>
                <div className="mt-2 text-base font-bold">مبلغ للشهر</div>
                <div className="mt-1 text-xs text-[var(--sand-muted)]">
                  يُحوَّل إلى وجبات طوال رمضان
                </div>
                <div className="mt-2 text-xs text-[var(--sand-strong)]">
                  {formatEnglishNumber(statsPayload.stats.remainingDays)} يوم متبقٍ
                </div>
              </button>
            </div>

            {donationType === "meals" && (
              <>
                <div className="info-box text-sm">
                  🗓️ هذه الوجبات ستُوزَّع في {distributionLabel} مباشرة.
                </div>
                <div className="rounded-[24px] bg-[rgba(201,149,106,0.08)] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      className="counter-button"
                      onClick={() => setMealCount((current) => current + 1)}
                    >
                      +
                    </button>
                    <span className="text-6xl font-black text-[var(--sand-strong)]">
                      {formatEnglishNumber(mealCount)}
                    </span>
                    <button
                      type="button"
                      className="counter-button"
                      onClick={() =>
                        setMealCount((current) => Math.max(1, current - 1))
                      }
                    >
                      −
                    </button>
                  </div>
                  <div className="mt-4 text-center text-sm text-[var(--sand-muted)]">
                    {formatEnglishNumber(mealCount)} ×{" "}
                    {formatEnglishNumber(mealPrice)} ={" "}
                    {formatEnglishNumber(mealCount * mealPrice)} جنيه
                  </div>
                </div>
              </>
            )}

            {donationType === "amount" && (
              <>
                <div className="info-box text-sm">
                  🌙 مبلغك يُوزَّع على شكل وجبات على مدار ما تبقى من رمضان.
                </div>
                <input
                  type="number"
                  min={1}
                  className="field-input"
                  placeholder="المبلغ بالجنيه"
                  value={amountEGP}
                  onChange={(event) => setAmountEGP(event.target.value)}
                />
                {parsedAmount > 0 && (
                  <div className="text-sm leading-8 text-[var(--sand-muted)]">
                    <div>
                      يعادل {formatEnglishNumber(totalMeals)} وجبة إجمالاً على مدار
                      رمضان
                    </div>
                    <div>
                      يضيف {formatEnglishNumber(amountMealsForDistributionDate)} وجبة
                      إلى يوم التوزيع الحالي
                    </div>
                    <div>
                      ثم تُوزَّع بقية الوجبات يومًا بعد يوم حتى آخر يوم، ثم يبدأ
                      التوزيع من أول يوم من جديد حتى يقل المبلغ عن سعر وجبة واحدة
                    </div>
                  </div>
                )}
              </>
            )}

            {validationError && (
              <div className="text-center text-sm text-[#f6a1a1]">
                {validationError}
              </div>
            )}

            <button type="button" className="btn-gold" onClick={continueToConfirmation}>
              متابعة ←
            </button>
          </section>
        )}

        {screenState === "confirm" && (
          <section className="glass-card flex flex-col gap-5 text-center">
            <div className="text-4xl">🌙</div>
            <h2 className="text-2xl font-bold text-[var(--sand-main)]">
              تأكيد التبرع
            </h2>
            <div className="divider" />
            {donationType === "meals" ? (
              <div className="rounded-[22px] bg-[rgba(201,149,106,0.08)] p-5 text-right">
                <div className="confirm-row">
                  <span>نوع التبرع</span>
                  <span className="tag-pill">🍱 وجبات للغد</span>
                </div>
                <div className="confirm-row">
                  <span>عدد الوجبات</span>
                  <span className="confirm-value">
                    {formatEnglishNumber(mealCount)} وجبة
                  </span>
                </div>
                <div className="confirm-row">
                  <span>المبلغ النهائي</span>
                  <span className="confirm-value">
                    {formatEnglishNumber(totalAmount)} جنيه
                  </span>
                </div>
                <div className="confirm-row">
                  <span>موعد التوزيع</span>
                  <span className="text-sm text-[var(--sand-strong)]">
                    {distributionLabel}
                  </span>
                </div>
                <div className="confirm-row">
                  <span>إجمالي وجبات الغد بعد تبرعك</span>
                  <span className="confirm-value">
                    {formatEnglishNumber(totalMealsTomorrowAfterMyDonation)} وجبة
                  </span>
                </div>
                <div className="mt-4 text-sm text-[var(--sand-muted)]">
                  من بينها {formatEnglishNumber(mealCount)} وجبة من تبرعك الحالي
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] bg-[rgba(201,149,106,0.08)] p-5 text-right">
                <div className="confirm-row">
                  <span>نوع التبرع</span>
                  <span className="tag-pill">💛 مبلغ للشهر</span>
                </div>
                <div className="confirm-row">
                  <span>عدد الوجبات</span>
                  <span className="confirm-value">
                    {formatEnglishNumber(totalMeals)} 🍽️
                  </span>
                </div>
                <div className="confirm-row">
                  <span>المبلغ</span>
                  <span className="confirm-value">
                    {formatEnglishNumber(totalAmount)} جنيه
                  </span>
                </div>
                <div className="confirm-row">
                  <span>موعد التوزيع</span>
                  <span className="text-sm text-[var(--sand-strong)]">
                    طوال شهر رمضان (
                    {formatEnglishNumber(statsPayload.stats.remainingDays)} يوم متبقٍ)
                  </span>
                </div>
                <div className="confirm-row">
                  <span>إضافة وجبات الغد</span>
                  <span className="confirm-value">
                    +{formatEnglishNumber(amountMealsForDistributionDate)} وجبة
                  </span>
                </div>
                <div className="confirm-row">
                  <span>إجمالي وجبات الغد بعد تبرعك</span>
                  <span className="confirm-value">
                    {formatEnglishNumber(totalMealsTomorrowAfterMyDonation)} وجبة
                  </span>
                </div>
                <div className="mt-4 text-xs leading-7 text-[var(--sand-subtle)]">
                  بعد ذلك يتم توزيع بقية وجبات مبلغ الشهر بالتتابع على الأيام
                  التالية، وعند الوصول لآخر يوم يبدأ التوزيع من أول يوم مرة أخرى.
                </div>
              </div>
            )}

            <div className="instapay-box">
              <div className="text-xs text-[var(--sand-subtle)]">ادفع عبر</div>
              <div className="mt-1 text-lg font-bold">💳 InstaPay</div>
              <div className="mt-3 font-mono text-base text-[var(--sand-strong)]">
                {statsPayload.payment.instapayHandle}
              </div>
              <a
                href={statsPayload.payment.instapayLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold mt-4 inline-flex w-auto items-center justify-center px-6"
              >
                اضغط هنا للدفع ←
              </a>
            </div>

            <div className="instapay-box">
              <div className="text-xs text-[var(--sand-subtle)]">أو ادفع عبر</div>
              <div className="mt-1 text-lg font-bold text-[#f28f8f]">
                📱 فودافون كاش
              </div>
              <div className="mt-3 font-mono text-2xl tracking-[0.3em] text-[var(--sand-strong)]">
                {statsPayload.payment.vodafoneCashNumber}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(201,149,106,0.2)] bg-[rgba(255,214,149,0.12)] p-4 text-right">
              <div className="text-sm font-bold text-[var(--sand-strong)]">
                ملاحظة مهمة
              </div>
              <div className="mt-2 text-sm leading-8 text-[var(--sand-muted)]">
                بعد إتمام الدفع، يرجى الرجوع إلى الموقع والضغط على زر تأكيد الدفع
                حتى يتم تسجيل تبرعك في النظام.
              </div>
            </div>

            <TurnstileWidget
              siteKey={statsPayload.turnstileSiteKey}
              resetKey={turnstileResetKey}
              onTokenChange={setTurnstileToken}
            />

            {validationError && (
              <div className="text-sm text-[#f6a1a1]">{validationError}</div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => setScreenState("choose")}
              >
                رجوع
              </button>
              <button
                type="button"
                className="btn-gold flex-[2]"
                disabled={submitting || !canDonate}
                onClick={() => void submitDonation()}
              >
                {submitting ? "جاري التأكيد..." : "✓ تأكيد الدفع"}
              </button>
            </div>
          </section>
        )}

        {screenState === "done" && (
          <section className="glass-card flex flex-col gap-4 text-center">
            <div className="text-6xl">🎉</div>
            <div className="font-[var(--font-title)] text-4xl text-[var(--sand-strong)]">
              جزاك الله خيرًا
            </div>
            <p className="text-sm leading-8 text-[var(--sand-muted)]">
              {donationType === "meals"
                ? `تبرعك بـ ${formatEnglishNumber(totalMeals)} وجبة سيصل للمستحقين في ${distributionLabel}.`
                : `تبرعك بـ ${formatEnglishNumber(totalAmount)} جنيه يكفل ${formatEnglishNumber(
                    totalMeals,
                  )} وجبة، ويضيف ${formatEnglishNumber(
                    amountMealsForDistributionDate,
                  )} وجبة إلى إجمالي يوم التوزيع الحالي.`}
            </p>
            <div className="divider" />
            <div className="text-xs text-[var(--sand-faint)]">
              إجمالي وجبات الغد الآن
            </div>
            <span className="meal-counter">
              {formatEnglishNumber(statsPayload.stats.projectedMealsTomorrow)}
            </span>
            <div className="text-sm text-[var(--sand-strong)]">وجبة إفطار</div>
            <button
              type="button"
              className="btn-gold"
              onClick={() => {
                setScreenState("home");
                resetDonationFlow();
              }}
            >
              العودة للرئيسية
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
