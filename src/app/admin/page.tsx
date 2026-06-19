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
  let pendingInqCount = 0;

  try {
    const [pub, draft, clients, pendingAppts, pendingInq] = await Promise.all([
      supabase.from("articles").select("*", { count: "exact", head: true }).eq("published", true),
      supabase.from("articles").select("*", { count: "exact", head: true }).eq("published", false),
      supabase.from("clients").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("appointments").select("*", { count: "exact", head: true }).eq("booking_status", "pending_admin"),
      supabase.from("booking_inquiries").select("*", { count: "exact", head: true }).eq("status", "new"),
    ]);
    articleCount = pub.count ?? 0;
    draftCount = draft.count ?? 0;
    clientCount = clients.count ?? 0;
    pendingApptCount = pendingAppts.count ?? 0;
    pendingInqCount = pendingInq.count ?? 0;
  } catch {
    // tables may not be set up yet
  }

  const today = new Date().toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  // Main bento cards (8 items = 3×3 minus 1, handled with col-span)
  const mainCards = [
    {
      href: "/admin/appointments",
      label: "預約派案",
      desc: "管理個案預約申請，排案給心理師，追蹤派案狀態",
      stat: pendingApptCount > 0 ? `${pendingApptCount} 筆待排案` : "目前無待排案",
      urgent: pendingApptCount > 0,
      wide: true,
    },
    {
      href: "/admin/inquiries",
      label: "申請佇列",
      desc: "新進預約申請信箱，轉換為正式預約",
      stat: pendingInqCount > 0 ? `${pendingInqCount} 筆新申請` : "目前無新申請",
      urgent: pendingInqCount > 0,
      wide: false,
    },
    {
      href: "/admin/clients",
      label: "個案管理",
      desc: "建立與管理個案資料，指派負責心理師",
      stat: `${clientCount} 位個案`,
      urgent: false,
      wide: false,
    },
    {
      href: "/admin/calendar",
      label: "行事曆",
      desc: "查看所有已排定的諮商時程",
      stat: "月曆視圖",
      urgent: false,
      wide: false,
    },
    {
      href: "/admin/sessions",
      label: "晤談紀錄",
      desc: "心理師填寫晤談紀錄，行政查閱",
      stat: "加密保存",
      urgent: false,
      wide: false,
    },
    {
      href: "/admin/members",
      label: "成員資料",
      desc: "更新各成員的學歷、證照、學會、服務收費",
      stat: `${TEAM.length} 位成員`,
      urgent: false,
      wide: false,
    },
    {
      href: "/admin/salary",
      label: "薪酬系統",
      desc: "依各心理師抽成設定，計算當月分成與明細",
      stat: "月結報表",
      urgent: false,
      wide: false,
    },
    {
      href: "/admin/articles",
      label: "文章管理",
      desc: "新增、編輯、發布最新消息與心理知識文章",
      stat: `${articleCount} 篇已發布${draftCount > 0 ? ` · ${draftCount} 篇草稿` : ""}`,
      urgent: false,
      wide: false,
    },
  ];

  return (
    <div className="space-y-8 pt-4">

      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="font-sans text-xs text-muted/60 mb-2">{today}</p>
          <h1 className="font-serif text-deep text-3xl">儀表板</h1>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-sans text-xs text-muted/50 hover:text-muted transition-colors"
        >
          ↗ 前往前台
        </a>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {mainCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={[
              "group block p-6 bg-white rounded-lg border transition-all duration-200 hover:shadow-sm",
              card.wide ? "sm:col-span-2 lg:col-span-2" : "",
              card.urgent ? "adm-card-urgent" : "border-sand/20 hover:border-sand/30",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="font-serif text-deep text-xl">{card.label}</h2>
              {card.urgent && (
                <span className="flex-shrink-0 font-sans text-[10px] px-2 py-0.5 rounded-full tracking-wider uppercase adm-urgent-tag">
                  {card.href.includes("appointments") ? pendingApptCount : pendingInqCount} 待處理
                </span>
              )}
            </div>
            <p className="font-sans text-sm text-muted leading-relaxed mb-5">
              {card.desc}
            </p>
            <p className={`font-sans text-xs ${card.urgent ? "adm-urgent-stat font-medium" : "text-muted/40"}`}>
              {card.stat}
            </p>
          </Link>
        ))}
      </div>

      {/* Utility row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/admin/rooms"
          className="flex items-center justify-between px-5 py-4 bg-white rounded-lg border border-sand/20 hover:border-sand/30 hover:shadow-sm transition-all duration-200"
        >
          <div>
            <p className="font-sans text-sm text-deep">空間管理</p>
            <p className="font-sans text-xs text-muted/50 mt-0.5">諮商室 CRUD</p>
          </div>
          <span className="font-sans text-xs text-muted/30 group-hover:text-muted/60">→</span>
        </Link>
        <Link
          href="/admin/service-plans"
          className="flex items-center justify-between px-5 py-4 bg-white rounded-lg border border-sand/20 hover:border-sand/30 hover:shadow-sm transition-all duration-200"
        >
          <div>
            <p className="font-sans text-sm text-deep">方案設定</p>
            <p className="font-sans text-xs text-muted/50 mt-0.5">服務費用方案</p>
          </div>
          <span className="font-sans text-xs text-muted/30">→</span>
        </Link>
        <Link
          href="/admin/invite"
          className="flex items-center justify-between px-5 py-4 bg-white rounded-lg border border-dashed border-sand/20 hover:border-[#2D5440] hover:bg-sand/5 transition-all duration-200"
        >
          <div>
            <p className="font-sans text-sm text-deep">邀請成員</p>
            <p className="font-sans text-xs text-muted/50 mt-0.5">
              {auth.role === "director" ? "邀請行政或心理師" : "邀請心理師"}
            </p>
          </div>
          <span className="font-sans text-xs text-muted/30">→</span>
        </Link>
      </div>

    </div>
  );
}
