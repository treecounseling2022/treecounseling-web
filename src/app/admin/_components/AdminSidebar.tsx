"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAdminTheme } from "./AdminThemeProvider";
import { NotificationBell } from "./NotificationBell";

type NavItem = {
  href: string;
  label: string;
  badge?: number;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

type Props = {
  role: string;
  email: string;
  profileId: string | null;
  pendingInquiries: number;
  pendingAppointments: number;
};

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

const ROLE_LABEL: Record<string, string> = {
  director: "所長",
  admin: "行政",
  therapist: "心理師",
};

export default function AdminSidebar({ role, email, profileId, pendingInquiries, pendingAppointments }: Props) {
  const pathname = usePathname();
  const { isDark, mounted, toggle } = useAdminTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = role === "director" || role === "admin";

  const adminNavGroups: NavGroup[] = [
    {
      items: [
        { href: "/admin", label: "儀表板" },
      ],
    },
    {
      label: "業務",
      items: [
        { href: "/admin/inquiries", label: "申請佇列", badge: pendingInquiries },
        { href: "/admin/appointments", label: "預約派案", badge: pendingAppointments },
        { href: "/admin/calendar", label: "行事曆" },
        { href: "/admin/clients", label: "個案管理" },
        { href: "/admin/sessions", label: "晤談紀錄" },
      ],
    },
    {
      label: "設定",
      items: [
        { href: "/admin/members", label: "成員" },
        { href: "/admin/rooms", label: "空間" },
        { href: "/admin/workshops", label: "講座" },
        { href: "/admin/service-plans", label: "方案設定" },
        ...(role === "director" ? [{ href: "/admin/salary", label: "薪酬計算" }] : []),
        { href: "/admin/articles", label: "文章" },
        { href: "/admin/invite", label: "邀請成員" },
      ],
    },
  ];

  const therapistNavGroups: NavGroup[] = profileId ? [
    {
      label: "我的",
      items: [
        { href: `/admin/members/${profileId}`, label: "我的資料" },
        { href: "/admin/my-salary", label: "我的薪酬" },
      ],
    },
    {
      label: "業務",
      items: [
        { href: "/admin/clients", label: "我的個案" },
        { href: "/admin/appointments", label: "預約", badge: pendingAppointments },
        { href: "/admin/appointments/new", label: "新增預約" },
        { href: "/admin/calendar", label: "行事曆" },
        { href: "/admin/sessions", label: "晤談紀錄" },
      ],
    },
    {
      label: "內容",
      items: [
        { href: "/admin/articles", label: "文章" },
      ],
    },
  ] : [];

  const navGroups = isAdmin ? adminNavGroups : therapistNavGroups;

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  const totalBadge = pendingInquiries + pendingAppointments;

  const sidebarContent = (
    <div className={`flex flex-col h-full ${isDark ? "bg-[#111111]" : "bg-[#1F2A24]"}`}>

      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-white/[0.07]">
        <div className="flex items-start justify-between">
          <Link href="/admin" className="block" onClick={() => setMobileOpen(false)}>
            <p className="font-sans text-[9px] text-white/25 tracking-[0.18em] uppercase mb-2">
              Tree Counseling
            </p>
            <p className="font-serif text-white text-[15px] leading-snug">
              後台管理
            </p>
          </Link>
          <NotificationBell
            pendingInquiries={pendingInquiries}
            pendingAppointments={pendingAppointments}
            role={role}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4 pt-3 border-t border-white/[0.07]" : ""}>
            {group.label && (
              <p className="font-sans text-[9px] text-white/25 tracking-[0.12em] uppercase px-3 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-px">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
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

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-white/[0.07] space-y-0.5">
        {/* User info */}
        <div className="px-3 py-2 mb-1">
          <p className="font-sans text-[9px] text-white/25 tracking-[0.1em] uppercase mb-0.5">
            {ROLE_LABEL[role] ?? role}
          </p>
          <p className="font-sans text-[11px] text-white/40 truncate">{email}</p>
        </div>

        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={toggle}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition-colors cursor-pointer font-sans text-xs"
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
            <span>{isDark ? "切換至亮色" : "切換至暗色"}</span>
          </button>
        )}

        {/* Logout */}
        <form action="/api/admin/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2 w-full px-3 py-2 rounded text-white/30 hover:text-red-400 hover:bg-white/[0.04] transition-colors cursor-pointer font-sans text-xs"
          >
            <LogoutIcon />
            登出
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className={`md:hidden h-12 flex items-center px-4 gap-3 border-b border-white/[0.06] ${isDark ? "bg-[#111111]" : "bg-[#1F2A24]"}`}>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex flex-col gap-[5px] p-1.5 cursor-pointer"
          aria-label="開啟選單"
          aria-expanded={mobileOpen}
        >
          <span className="w-4 h-[1.5px] bg-white/50 block" />
          <span className="w-4 h-[1.5px] bg-white/50 block" />
          <span className="w-3 h-[1.5px] bg-white/50 block" />
        </button>
        <span className="font-serif text-white text-sm">樹心理後台</span>
        {totalBadge > 0 && (
          <span className="min-w-[17px] h-[17px] rounded-full bg-red-500 text-white text-[9px] font-medium flex items-center justify-center px-1">
            {totalBadge}
          </span>
        )}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={`md:hidden fixed inset-y-0 left-0 z-50 w-60 transition-transform duration-300 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-col md:w-52 md:fixed md:inset-y-0 md:left-0 md:z-30">
        {sidebarContent}
      </div>
    </>
  );
}
