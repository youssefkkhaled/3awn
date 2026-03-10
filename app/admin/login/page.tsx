import Image from "next/image";
import { redirect } from "next/navigation";

import { loginAction } from "@/app/admin/actions";
import { getAdminSessionState } from "@/lib/auth";

const loginErrors: Record<string, string> = {
  credentials: "بيانات الدخول غير صحيحة.",
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, sessionState] = await Promise.all([
    searchParams,
    getAdminSessionState(),
  ]);

  if (sessionState.user && sessionState.isAdmin) {
    redirect("/admin");
  }

  const errorCode =
    typeof params.error === "string" ? params.error : undefined;

  return (
    <main className="donation-shell">
      <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-card flex flex-col justify-center gap-5 text-center lg:text-right">
          <div className="flex justify-center lg:justify-start">
            <Image
              src="/hero.jpeg"
              alt="إدارة عوّن"
              width={180}
              height={180}
              priority
              className="rounded-[28px] object-contain"
            />
          </div>
          <div className="tag-pill w-fit self-center lg:self-start">لوحة الإدارة</div>
          <h1 className="font-[var(--font-title)] text-4xl text-[var(--sand-main)]">
            إدارة عوّن
          </h1>
          <p className="text-sm leading-8 text-[var(--sand-muted)]">
            تابع وجبات الغد، راجع تبرعات مبلغ الشهر، وأدر الإعدادات والدفعات من
            نفس الواجهة بنفس الطابع البصري للتطبيق.
          </p>
          <div className="info-box text-right text-sm">
            هذه الواجهة مخصصة للإدارة فقط، وتعرض توزيع الوجبات بين الحجز المباشر
            ومساهمات مبلغ الشهر.
          </div>
        </section>

        <section className="glass-card flex flex-col gap-5">
          <div className="tag-pill w-fit">تسجيل الدخول</div>
          <h2 className="text-3xl font-bold text-[var(--sand-main)]">
            دخول الإدارة
          </h2>
          <p className="text-sm leading-8 text-[var(--sand-muted)]">
            سجّل الدخول باستخدام حساب المدير المحلي المحفوظ في قاعدة البيانات.
          </p>

          {errorCode ? (
            <div className="rounded-2xl border border-[rgba(240,121,121,0.25)] bg-[rgba(240,121,121,0.08)] p-4 text-sm text-[#f6b2b2]">
              {loginErrors[errorCode] || "تعذر تسجيل الدخول."}
            </div>
          ) : null}

          <form action={loginAction} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm text-[var(--sand-muted)]">
              اسم المستخدم
              <input
                className="admin-input"
                type="text"
                name="username"
                placeholder="seif"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-[var(--sand-muted)]">
              كلمة المرور
              <input
                className="admin-input"
                type="password"
                name="password"
                placeholder="••••••••"
                required
              />
            </label>

            <button type="submit" className="btn-gold mt-2">
              دخول الإدارة
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
