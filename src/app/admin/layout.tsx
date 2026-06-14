import type { Metadata } from "next";
import Link from "next/link";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

export const metadata: Metadata = {
  title: "後台管理 - 樹心理工作室",
  robots: { index: false, follow: false },
};

const ROLE_LABEL: Record<string, string> = {
  director: "所長",
  admin: "行政",
  therapist: "心理師",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthInfo();

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      {auth && (
        <header className="bg-deep text-paper h-12 flex items-center px-6 gap-6">
          <span className="font-serif text-sm mr-4">樹心理後台</span>
          <nav className="flex items-center gap-5 text-xs font-sans text-paper/70">
            {isAdminLevel(auth.role) ? (
              <>
                <Link href="/admin" className="hover:text-paper transition-colors">
                  儀表板
                </Link>
                <Link href="/admin/members" className="hover:text-paper transition-colors">
                  成員
                </Link>
                <Link href="/admin/clients" className="hover:text-paper transition-colors">
                  個案
                </Link>
                <Link href="/admin/appointments" className="hover:text-paper transition-colors">
                  預約派案
                </Link>
                <Link href="/admin/calendar" className="hover:text-paper transition-colors">
                  行事曆
                </Link>
                <Link href="/admin/rooms" className="hover:text-paper transition-colors">
                  空間
                </Link>
                <Link href="/admin/workshops" className="hover:text-paper transition-colors">
                  講座
                </Link>
                <Link href="/admin/salary" className="hover:text-paper transition-colors">
                  薪酬
                </Link>
                <Link href="/admin/sessions" className="hover:text-paper transition-colors">
                  晤談紀錄
                </Link>
                <Link href="/admin/articles" className="hover:text-paper transition-colors">
                  文章
                </Link>
                <Link href="/admin/invite" className="hover:text-paper transition-colors">
                  邀請
                </Link>
              </>
            ) : auth.profileId ? (
              <>
                <Link
                  href={`/admin/members/${auth.profileId}`}
                  className="hover:text-paper transition-colors"
                >
                  我的資料
                </Link>
                <Link href="/admin/clients" className="hover:text-paper transition-colors">
                  我的個案
                </Link>
                <Link href="/admin/appointments" className="hover:text-paper transition-colors">
                  預約
                </Link>
                <Link href="/admin/sessions" className="hover:text-paper transition-colors">
                  晤談紀錄
                </Link>
                <Link href="/admin/salary" className="hover:text-paper transition-colors">
                  薪酬
                </Link>
              </>
            ) : (
              <span className="text-paper/40">帳號尚未連結至成員資料</span>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs font-sans">
            <span className="text-paper/40 hidden md:inline">
              {ROLE_LABEL[auth.role] ?? auth.role}
            </span>
            <span className="text-paper/60 hidden md:inline">{auth.email}</span>
            <form action="/api/admin/logout" method="POST">
              <button
                type="submit"
                className="px-3 py-1 border border-paper/30 text-paper/80 hover:bg-paper/10 hover:text-paper hover:border-paper/60 transition-colors cursor-pointer"
              >
                登出
              </button>
            </form>
          </div>
        </header>
      )}
      <main className="p-6 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
