"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAdminTheme } from "./AdminThemeProvider";
import { NotificationBell } from "./NotificationBell";
import { cn } from "@/lib/utils";

type NavItem  = { href: string; label: string; badge?: number };
type NavGroup = { label?: string; items: NavItem[] };

type Props = {
  role: string;
  email: string;
  profileId: string | null;
  pendingInquiries: number;
  pendingAppointments: number;
};

// ── Icons ────────────────────────────────────────────────────────────────────
function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

function AdminIcon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  const p = { viewBox: "0 0 24 24", fill: "none" as const, stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className };
  switch (name) {
    case "dashboard":
      return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case "inbox":
      return <svg {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>;
    case "appointments":
      return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>;
    case "clients":
      return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "calendar":
      return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case "new":
      return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="15" x2="12" y2="19"/><line x1="10" y1="17" x2="14" y2="17"/></svg>;
    case "sessions":
      return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
    case "members":
      return <svg {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case "rooms":
      return <svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
    case "workshops":
      return <svg {...p}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
    case "plans":
      return <svg {...p}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
    case "salary":
      return <svg {...p}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    case "articles":
      return <svg {...p}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6z"/></svg>;
    case "invite":
      return <svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>;
    case "profile":
      return <svg {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case "more":
      return <svg {...p}><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></svg>;
    case "close":
      return <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
    default:
      return null;
  }
}

const ROLE_LABEL: Record<string, string> = {
  director: "所長",
  admin: "行政",
  therapist: "心理師",
};

// ── Drawer item icon map ─────────────────────────────────────────────────────
const ITEM_ICON: Record<string, string> = {
  "/admin":                  "dashboard",
  "/admin/inquiries":        "inbox",
  "/admin/appointments":     "appointments",
  "/admin/calendar":         "calendar",
  "/admin/clients":          "clients",
  "/admin/sessions":         "sessions",
  "/admin/members":          "members",
  "/admin/rooms":            "rooms",
  "/admin/workshops":        "workshops",
  "/admin/service-plans":    "plans",
  "/admin/salary":           "salary",
  "/admin/articles":         "articles",
  "/admin/invite":           "invite",
  "/admin/import":           "clients",
  "/admin/appointments/new": "new",
  "/admin/my-salary":        "salary",
};

function itemIcon(href: string) {
  return ITEM_ICON[href] ?? "dashboard";
}

// ── Component ────────────────────────────────────────────────────────────────
export default function AdminSidebar({ role, email, profileId, pendingInquiries, pendingAppointments }: Props) {
  const pathname  = usePathname();
  const { isDark, mounted, toggle } = useAdminTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAdmin = role === "director" || role === "admin";

  const adminNavGroups: NavGroup[] = [
    {
      items: [{ href: "/admin", label: "儀表板" }],
    },
    {
      label: "業務",
      items: [
        { href: "/admin/inquiries",    label: "申請佇列",  badge: pendingInquiries },
        { href: "/admin/appointments", label: "預約派案",  badge: pendingAppointments },
        { href: "/admin/calendar",     label: "行事曆" },
        { href: "/admin/clients",      label: "個案管理" },
        { href: "/admin/sessions",     label: "晤談紀錄" },
      ],
    },
    {
      label: "設定",
      items: [
        { href: "/admin/members",       label: "成員" },
        { href: "/admin/rooms",         label: "空間" },
        { href: "/admin/workshops",     label: "講座" },
        { href: "/admin/service-plans", label: "方案設定" },
        ...(role === "director" ? [{ href: "/admin/salary", label: "薪酬計算" }] : []),
        { href: "/admin/articles",      label: "文章" },
        { href: "/admin/invite",        label: "邀請成員" },
        { href: "/admin/import",        label: "匯入個案" },
      ],
    },
  ];

  const therapistNavGroups: NavGroup[] = profileId ? [
    {
      label: "我的",
      items: [
        { href: `/admin/members/${profileId}`, label: "我的資料" },
        { href: "/admin/my-salary",            label: "我的薪酬" },
      ],
    },
    {
      label: "業務",
      items: [
        { href: "/admin/clients",          label: "我的個案" },
        { href: "/admin/appointments",     label: "預約",    badge: pendingAppointments },
        { href: "/admin/appointments/new", label: "新增預約" },
        { href: "/admin/calendar",         label: "行事曆" },
        { href: "/admin/sessions",         label: "晤談紀錄" },
      ],
    },
    {
      label: "內容",
      items: [{ href: "/admin/articles", label: "文章" }],
    },
  ] : [];

  const navGroups = isAdmin ? adminNavGroups : therapistNavGroups;

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  const totalBadge = pendingInquiries + pendingAppointments;

  // ── Mobile bottom tabs ────────────────────────────────────────────────────
  type BottomTab = { href?: string; label: string; icon: string; badge?: number; isMenu?: boolean };

  const adminTabs: BottomTab[] = [
    { href: "/admin",             label: "首頁", icon: "dashboard" },
    { href: "/admin/inquiries",   label: "申請", icon: "inbox",        badge: pendingInquiries },
    { href: "/admin/appointments",label: "預約", icon: "appointments", badge: pendingAppointments },
    { href: "/admin/clients",     label: "個案", icon: "clients" },
    { label: "選單", icon: "more", isMenu: true },
  ];

  const therapistTabs: BottomTab[] = profileId ? [
    { href: "/admin/appointments/new", label: "新增", icon: "new" },
    { href: "/admin/appointments",     label: "預約", icon: "appointments", badge: pendingAppointments },
    { href: "/admin/calendar",         label: "行事曆", icon: "calendar" },
    { href: "/admin/clients",          label: "個案",   icon: "clients" },
    { label: "選單", icon: "more", isMenu: true },
  ] : [];

  const bottomTabs = isAdmin ? adminTabs : therapistTabs;

  // ── Desktop sidebar content ───────────────────────────────────────────────
  const sidebarContent = (
    <div className={`flex flex-col h-full ${isDark ? "bg-[#111111]" : "bg-[#1F2A24]"}`}>
      <div className="px-5 pt-6 pb-5 border-b border-white/[0.07]">
        <div className="flex items-start justify-between">
          <Link href="/admin" className="block">
            <p className="font-sans text-[9px] text-white/25 tracking-[0.18em] uppercase mb-2">Tree Counseling</p>
            <p className="font-serif text-white text-[15px] leading-snug">後台管理</p>
          </Link>
          <NotificationBell pendingInquiries={pendingInquiries} pendingAppointments={pendingAppointments} role={role} />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4 pt-3 border-t border-white/[0.07]" : ""}>
            {group.label && (
              <p className="font-sans text-[9px] text-white/25 tracking-[0.12em] uppercase px-3 mb-1.5">{group.label}</p>
            )}
            <div className="space-y-px">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={active ? {
                      boxShadow: isDark ? "inset 2px 0 0 #34D399" : "inset 2px 0 0 rgba(255,255,255,0.7)",
                      backgroundColor: isDark ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.12)",
                    } : undefined}
                    className={`flex items-center justify-between px-3 py-[7px] rounded text-[13px] font-sans transition-colors cursor-pointer ${
                      active
                        ? isDark ? "text-[#34D399]" : "text-white font-medium"
                        : "text-white/40 hover:text-white/80 hover:bg-white/[0.05]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="min-w-[17px] h-[17px] rounded-full bg-red-500 text-white text-[9px] font-medium flex items-center justify-center px-1 leading-none">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-4 pt-3 border-t border-white/[0.07] space-y-0.5">
        <div className="px-3 py-2 mb-1">
          <p className="font-sans text-[9px] text-white/25 tracking-[0.1em] uppercase mb-0.5">{ROLE_LABEL[role] ?? role}</p>
          <p className="font-sans text-[11px] text-white/40 truncate">{email}</p>
        </div>
        {mounted && (
          <button onClick={toggle} className="flex items-center gap-2.5 w-full px-3 py-2 rounded text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition-colors cursor-pointer font-sans text-xs">
            {isDark ? <SunIcon /> : <MoonIcon />}
            <span>{isDark ? "切換至亮色" : "切換至暗色"}</span>
          </button>
        )}
        <form action="/api/admin/logout" method="POST">
          <button type="submit" className="flex items-center gap-2 w-full px-3 py-2 rounded text-white/30 hover:text-red-400 hover:bg-white/[0.04] transition-colors cursor-pointer font-sans text-xs">
            <LogoutIcon />
            登出
          </button>
        </form>
      </div>
    </div>
  );

  const bgMain  = isDark ? "bg-[#111111]" : "bg-[#1F2A24]";
  const bgShell = isDark ? "bg-[#1a1a1a]" : "bg-[#28352C]";

  return (
    <>
      {/* ── Mobile: slim top bar ──────────────────────────────────────── */}
      <div className={cn("md:hidden h-12 flex items-center px-4 justify-between border-b border-white/[0.06]", bgMain)}>
        <Link href="/admin" className="flex items-center gap-2">
          <span className="font-serif text-white text-sm">樹心理後台</span>
          {totalBadge > 0 && (
            <span className="min-w-[17px] h-[17px] rounded-full bg-red-500 text-white text-[9px] font-medium flex items-center justify-center px-1">
              {totalBadge > 99 ? "99+" : totalBadge}
            </span>
          )}
        </Link>
        <NotificationBell pendingInquiries={pendingInquiries} pendingAppointments={pendingAppointments} role={role} />
      </div>

      {/* ── Mobile: backdrop ─────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={() => setDrawerOpen(false)}
        className={cn(
          "fixed inset-0 z-40 md:hidden bg-black/50 backdrop-blur-[2px] transition-opacity duration-300",
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* ── Mobile: bottom sheet drawer ──────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="後台選單"
        aria-hidden={!drawerOpen}
        className={cn(
          "fixed left-0 right-0 z-50 md:hidden rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out overflow-y-auto",
          bgShell,
          drawerOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom))", maxHeight: "70vh" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/10" />
        </div>

        <div className="px-3 pb-4 pt-1">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-3 pt-3 border-t border-white/[0.07]" : ""}>
              {group.label && (
                <p className="font-sans text-[9px] text-white/25 tracking-[0.12em] uppercase px-2 mb-1.5">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-2 py-2.5 rounded-xl transition-colors",
                        active ? "bg-white/10" : "hover:bg-white/[0.05]"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        active ? "bg-white/20" : "bg-white/[0.07]"
                      )}>
                        <AdminIcon
                          name={itemIcon(item.href)}
                          className={cn("w-[16px] h-[16px]", active ? (isDark ? "text-[#34D399]" : "text-white") : "text-white/50")}
                        />
                      </div>
                      <span className={cn(
                        "flex-1 text-sm font-sans",
                        active ? (isDark ? "text-[#34D399] font-medium" : "text-white font-medium") : "text-white/50"
                      )}>
                        {item.label}
                      </span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="min-w-[17px] h-[17px] rounded-full bg-red-500 text-white text-[9px] font-medium flex items-center justify-center px-1 leading-none">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Footer: theme + logout */}
          <div className="mt-3 pt-3 border-t border-white/[0.07] space-y-0.5">
            {mounted && (
              <button onClick={toggle} className="flex items-center gap-3 w-full px-2 py-2.5 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors cursor-pointer font-sans text-sm">
                <div className="w-8 h-8 rounded-lg bg-white/[0.07] flex items-center justify-center">
                  {isDark ? <SunIcon /> : <MoonIcon />}
                </div>
                {isDark ? "切換至亮色" : "切換至暗色"}
              </button>
            )}
            <form action="/api/admin/logout" method="POST">
              <button type="submit" className="flex items-center gap-3 w-full px-2 py-2.5 rounded-xl text-white/30 hover:text-red-400 hover:bg-white/[0.04] transition-colors cursor-pointer font-sans text-sm">
                <div className="w-8 h-8 rounded-lg bg-white/[0.07] flex items-center justify-center">
                  <LogoutIcon />
                </div>
                登出
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Mobile: bottom tab bar ───────────────────────────────────── */}
      <nav
        aria-label="後台底部導覽"
        className={cn("fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/[0.06]", bgMain)}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around px-1 py-1.5">
          {bottomTabs.map((tab, i) => {
            if (tab.isMenu) {
              return (
                <button
                  key="menu"
                  type="button"
                  onClick={() => setDrawerOpen((o) => !o)}
                  aria-label={drawerOpen ? "關閉選單" : "開啟選單"}
                  aria-expanded={drawerOpen}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[44px] min-h-[44px] justify-center cursor-pointer"
                >
                  <span className={cn("transition-colors", drawerOpen ? "text-white/80" : "text-white/30")}>
                    <AdminIcon name={drawerOpen ? "close" : "more"} />
                  </span>
                  <span className={cn("text-[10px] font-sans transition-colors", drawerOpen ? "text-white/70" : "text-white/30")}>
                    {drawerOpen ? "關閉" : tab.label}
                  </span>
                </button>
              );
            }

            const active = isActive(tab.href!);
            const accentColor = isDark ? "text-[#34D399]" : "text-white";

            return (
              <Link
                key={i}
                href={tab.href!}
                onClick={() => setDrawerOpen(false)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[44px] min-h-[44px] justify-center relative"
              >
                <span className={cn("transition-colors", active ? accentColor : "text-white/30")}>
                  <AdminIcon name={tab.icon} />
                </span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute top-1 right-1.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[8px] font-medium flex items-center justify-center px-0.5 leading-none">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                )}
                <span className={cn("text-[10px] font-sans transition-colors", active ? accentColor : "text-white/30")}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Desktop: sidebar ─────────────────────────────────────────── */}
      <div className="hidden md:flex md:flex-col md:w-52 md:fixed md:inset-y-0 md:left-0 md:z-30">
        {sidebarContent}
      </div>
    </>
  );
}
