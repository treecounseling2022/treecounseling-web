import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth-role";
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

  const supabase = await createClient();

  let articleCount = 0;
  let draftCount = 0;
  let clientCount = 0;
  let pendingApptCount = 0;

  try {
    const [pub, draft, clients, pendingAppts] = await Promise.all([
      supabase.from("articles").select("*", { count: "exact", head: true }).eq("published", true),
      supabase.from("articles").select("*", { count: "exact", head: true }).eq("published", false),
      supabase.from("clients").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("appointments").select("*", { count: "exact", head: true }).eq("booking_status", "pending_admin"),
    ]);
    articleCount = pub.count ?? 0;
    draftCount = draft.count ?? 0;
    clientCount = clients.count ?? 0;
    pendingApptCount = pendingAppts.count ?? 0;
  } catch {
    // tables may not be set up yet
  }

  const cards = [
    {
      href: "/admin/appointments",
      label: "預約派案",
      desc: "管理個案預約申請，排案給心理師，追蹤派案狀態",
      count: pendingApptCount > 0 ? `${pendingApptCount} 筆待排案` : "目前無待排案",
      highlight: pendingApptCount > 0,
    },
    {
      href: "/admin/calendar",
      label: "行事曆",
      desc: "查看所有已排定的諮商時程，月曆視圖",
      count: "月曆視圖",
    },
    {
      href: "/admin/clients",
      label: "個案管理",
      desc: "建立與管理個案資料，指派負責心理師",
      count: `${clientCount} 位個案`,
    },
    {
      href: "/admin/members",
      label: "成員資料",
      desc: "更新各成員的學歷、證照、學會、經驗、服務收費",
      count: `${TEAM.length} 位成員`,
    },
    {
      href: "/admin/rooms",
      label: "空間管理",
      desc: "管理諮商室名稱、代表色與容量",
      count: "CRUD 管理",
    },
    {
      href: "/admin/salary",
      label: "薪酬系統",
      desc: "依各心理師抽成設定，計算當月分成與明細",
      count: "月結報表",
    },
    {
      href: "/admin/sessions",
      label: "晤談紀錄",
      desc: "心理師填寫晤談紀錄，行政查閱",
      count: "加密保存",
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`block p-5 bg-white border hover:shadow-sm transition-all ${
              "highlight" in card && card.highlight
                ? "border-amber-200 hover:border-amber-400"
                : "border-sand/20 hover:border-forest/40"
            }`}
          >
            <p className="font-serif text-deep text-lg mb-1">{card.label}</p>
            <p className="font-sans text-xs text-muted leading-relaxed mb-3">
              {card.desc}
            </p>
            <p className={`font-sans text-[11px] ${"highlight" in card && card.highlight ? "text-amber-600 font-medium" : "text-sand"}`}>
              {card.count}
            </p>
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
