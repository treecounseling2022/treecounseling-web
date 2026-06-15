"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  badge?: number;
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isAdmin = role === "director" || role === "admin";

  const adminNav: NavItem[] = [
    { href: "/admin", label: "儀表板" },
    { href: "/admin/inquiries", label: "申請佇列", badge: pendingInquiries },
    { href: "/admin/appointments", label: "預約派案", badge: pendingAppointments },
    { href: "/admin/calendar", label: "行事曆" },
    { href: "/admin/clients", label: "個案管理" },
    { href: "/admin/members", label: "成員" },
    { href: "/admin/rooms", label: "空間" },
    { href: "/admin/workshops", label: "講座" },
    { href: "/admin/service-plans", label: "方案設定" },
    ...(role === "director" ? [{ href: "/admin/salary", label: "薪酬計算" }] : []),
    { href: "/admin/sessions", label: "晤談紀錄" },
    { href: "/admin/articles", label: "文章" },
    { href: "/admin/invite", label: "邀請成員" },
  ];

  const therapistNav: NavItem[] = profileId ? [
    { href: `/admin/members/${profileId}`, label: "我的資料" },
    { href: "/admin/clients", label: "我的個案" },
    { href: "/admin/appointments", label: "預約", badge: pendingAppointments },
    { href: "/admin/appointments/new", label: "新增預約" },
    { href: "/admin/calendar", label: "行事曆" },
    { href: "/admin/sessions", label: "晤談紀錄" },
    { href: "/admin/my-salary", label: "我的薪酬" },
  ] : [];

  const navItems = isAdmin ? adminNav : therapistNav;

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  const isDark = mounted && resolvedTheme === "dark";

  const sidebarContent = (
    <div className={`flex flex-col h-full ${isDark ? "bg-[#141f18] border-[#2a3d30]" : "bg-[#1f2a24]"}`}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <Link href="/admin" className="block" onClick={() => setMobileOpen(false)}>
          <p className="font-sans text-[10px] text-white/40 tracking-[2px] mb-0.5">TREE COUNSELING</p>
          <p className="font-serif text-white text-base leading-tight">樹心理後台</p>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3 py-2 rounded text-sm font-sans transition-colors cursor-pointer ${
                active
                  ? "bg-white/15 text-white font-medium"
                  : "text-white/60 hover:text-white hover:bg-white/8"
              }`}
            >
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-medium flex items-center justify-center px-1 leading-none">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-2">
        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded text-white/50 hover:text-white hover:bg-white/8 transition-colors cursor-pointer font-sans text-xs"
            title={isDark ? "切換至亮色模式" : "切換至暗色模式"}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
            <span>{isDark ? "切換至亮色" : "切換至暗色"}</span>
          </button>
        )}

        {/* User info */}
        <div className="px-3 py-2">
          <p className="font-sans text-[10px] text-white/35 mb-0.5">{ROLE_LABEL[role] ?? role}</p>
          <p className="font-sans text-[11px] text-white/50 truncate">{email}</p>
        </div>

        {/* Logout */}
        <form action="/api/admin/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2 w-full px-3 py-2 rounded text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer font-sans text-xs"
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
      <div className={`md:hidden h-12 flex items-center px-4 gap-3 border-b ${
        isDark ? "bg-[#141f18] border-[#2a3d30]" : "bg-[#1f2a24] border-black/20"
      }`}>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex flex-col gap-1 p-1.5 cursor-pointer"
          aria-label="開啟選單"
        >
          <span className="w-4 h-0.5 bg-white/60 block" />
          <span className="w-4 h-0.5 bg-white/60 block" />
          <span className="w-4 h-0.5 bg-white/60 block" />
        </button>
        <span className="font-serif text-white text-sm">樹心理後台</span>
        {(pendingInquiries + pendingAppointments) > 0 && (
          <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-medium flex items-center justify-center px-1">
            {pendingInquiries + pendingAppointments}
          </span>
        )}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={`md:hidden fixed inset-y-0 left-0 z-50 w-60 transition-transform ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {sidebarContent}
      </div>

      {/* Desktop sidebar — always visible */}
      <div className="hidden md:flex md:flex-col md:w-52 md:fixed md:inset-y-0 md:left-0 md:z-30">
        {sidebarContent}
      </div>
    </>
  );
}
