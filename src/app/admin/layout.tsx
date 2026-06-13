import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "後台管理 - 樹心理工作室",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: { email?: string | null } | null = null;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      // Supabase not reachable — render without nav
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      {user && (
        <header className="bg-deep text-paper h-12 flex items-center px-6 gap-6">
          <span className="font-serif text-sm mr-4">樹心理後台</span>
          <nav className="flex items-center gap-5 text-xs font-sans text-paper/70">
            <Link href="/admin" className="hover:text-paper transition-colors">儀表板</Link>
            <Link href="/admin/therapists" className="hover:text-paper transition-colors">心理師資料</Link>
            <Link href="/admin/articles" className="hover:text-paper transition-colors">文章管理</Link>
          </nav>
          <div className="ml-auto flex items-center gap-4 text-xs font-sans text-paper/50">
            <span>{user.email}</span>
            <form action="/api/admin/logout" method="POST">
              <button type="submit" className="hover:text-paper transition-colors cursor-pointer">
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
