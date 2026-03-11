"use client";

export default function AdminErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="admin-shell">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <section className="glass-card text-center">
          <div className="tag-pill mx-auto">لوحة الإدارة</div>
          <h1 className="mt-4 text-3xl font-bold text-[var(--sand-main)]">
            تعذر تحميل لوحة الإدارة
          </h1>
          <p className="mt-4 text-sm leading-8 text-[var(--sand-muted)]">
            حدث خطأ أثناء تحميل بيانات الإدارة. جرّب إعادة التحميل مرة أخرى. إذا
            استمر الخطأ فراجع إعدادات قاعدة البيانات أو افتح سجلات Vercel.
          </p>
          {error.digest ? (
            <p className="mt-4 text-xs text-[var(--sand-subtle)]">
              Error ID: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            className="btn-gold mt-6"
            onClick={() => reset()}
          >
            إعادة المحاولة
          </button>
        </section>
      </div>
    </main>
  );
}
