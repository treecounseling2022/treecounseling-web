import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, isAdminLevel } from "@/lib/auth-role";
import { TEAM } from "@/lib/data";

export default async function AdminDashboard() {
  const auth = await requireAuth();

  if (auth.role === "therapist") {
    if (auth.profileId) {
      redirect(`/admin/members/${auth.profileId}`);
    }
    return (
      <div className="pt-16 text-center space-y-3">
        <h2 className="font-serif text-deep text-xl">帳號尚未連結</h2>
        <p className="font-sans text-sm text-muted">
          您的帳號尚未連結至任何成員資料，請聯絡行政人員進行設定。
        </p>
      </div>
    );
  }

  let articleCount = 0;
  let draftCount = 0;
  try {
    const supabase = await createClient();
    const [pub, draft] = await Promise.all([
      supabase
        .from("articles")
        .select("*", { count: "exact", head: true })
        .eq("published", true),
      supabase
        .from("articles")
        .select("*", { count: "exact", head: true })
        .eq("published", false),
    ]);
    articleCount = pub.count ?? 0;
    draftCount = draft.count ?? 0;
  } catch {
    // articles table not set up yet
  }

  const cards = [
    {
      href: "/admin/members",
      label: "成員資料",
      desc: "更新各成員的學歷、證照、學會、經驗、服務收費",
      count: `${TEAM.length} 位成員`,
    },
    {
      href: "/admin/articles",
      label: "文章管理",
      desc: "新增、編輯、發布最新消息與心理知識文章",
      count: `${articleCount} 篇已發布 · ${draftCount} 篇草稿`,
    },
    {
      href: "/admin/invite",
      label: "邀請成員",
      desc: "以 Email 邀請諮商師或行政人員加入後台",
      count: auth.role === "director" ? "所長可邀請行政與心理師" : "可邀請心理師",
    },
  ];

  return (
    <div className="space-y-8 pt-4">
      <div>
        <h1 className="font-serif text-deep text-2xl mb-1">儀表板</h1>
        <p className="font-sans text-xs text-muted">歡迎回來。選擇要管理的項目。</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block p-6 bg-white border border-sand/20 hover:border-forest/40 hover:shadow-sm transition-all"
          >
            <p className="font-serif text-deep text-lg mb-1">{card.label}</p>
            <p className="font-sans text-xs text-muted leading-relaxed mb-3">
              {card.desc}
            </p>
            <p className="font-sans text-[11px] text-sand">{card.count}</p>
          </Link>
        ))}
      </div>

      <div className="pt-4 border-t border-sand/20">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-sans text-xs text-muted hover:text-forest transition-colors"
        >
          ↗ 前往網站前台
        </a>
      </div>
    </div>
  );
}
