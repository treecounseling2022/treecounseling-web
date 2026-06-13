import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ count: articleCount }, { count: draftCount }] = await Promise.all([
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("published", true),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("published", false),
  ]);

  const cards = [
    {
      href: "/admin/therapists",
      label: "心理師資料",
      desc: "更新各心理師的證照、學會、經驗、服務收費",
      count: "4 位心理師",
    },
    {
      href: "/admin/articles",
      label: "文章管理",
      desc: "新增、編輯、發布最新消息與心理知識文章",
      count: `${articleCount ?? 0} 篇已發布 · ${draftCount ?? 0} 篇草稿`,
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
            <p className="font-sans text-xs text-muted leading-relaxed mb-3">{card.desc}</p>
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
