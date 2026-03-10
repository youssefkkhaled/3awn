import Link from "next/link";

import { logoutAction } from "@/app/admin/actions";
import { requireAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireAdminUser();

  return (
    <main className="admin-shell">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="glass-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="tag-pill">Ramadan 2026</div>
              <h1 className="mt-3 text-3xl font-bold text-[var(--sand-main)]">
                إدارة عوّن
              </h1>
              <p className="mt-2 text-sm text-[var(--sand-muted)]">
                {user.email}
              </p>
            </div>

            <form action={logoutAction}>
              <button type="submit" className="btn-ghost w-auto px-5">
                تسجيل الخروج
              </button>
            </form>
          </div>

          <nav className="admin-nav mt-5">
            <Link href="/admin">النظرة العامة</Link>
            <Link href="/admin/donations">التبرعات</Link>
            <Link href="/admin/adjustments">التعديلات</Link>
            <Link href="/admin/settings">الإعدادات</Link>
          </nav>
        </header>

        {children}
      </div>
    </main>
  );
}
