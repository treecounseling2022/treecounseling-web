"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Logo from "@/components/ui/Logo";

type NavChild = { href: string; label: string; sub?: string };
type NavLink = { href: string; label: string; children?: NavChild[] };

const NAV_LINKS: NavLink[] = [
  { href: "/about", label: "關於我們" },
  { href: "/services", label: "心理服務" },
  {
    href: "/team",
    label: "專業團隊",
    children: [
      { href: "/team/tanky", label: "唐國章", sub: "Tanky" },
      { href: "/team/veronica", label: "Veronica" },
      { href: "/team/joyce", label: "黃文靜", sub: "Joyce" },
      { href: "/team/mfok", label: "M Fok" },
    ],
  },
  { href: "/assessment", label: "心理自評" },
  { href: "/faq", label: "常見問題" },
  { href: "/news", label: "最新消息" },
];

// ── Inline SVG icons ─────────────────────────────────────────────────────────
function NavIcon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  const p = {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
  switch (name) {
    case "home":
      return <svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
    case "services":
      return <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
    case "booking":
      return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case "assessment":
      return <svg {...p}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
    case "menu":
      return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case "close":
      return <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
    case "about":
      return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>;
    case "team":
      return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "faq":
      return <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg>;
    case "news":
      return <svg {...p}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6z"/></svg>;
    default:
      return null;
  }
}

// ── Drawer items ─────────────────────────────────────────────────────────────
type DrawerItem = {
  href: string;
  label: string;
  icon: string;
  bg: string;
  fg: string;
  children?: { href: string; label: string }[];
};

const DRAWER_ITEMS: DrawerItem[] = [
  { href: "/about",      label: "關於我們", icon: "about",      bg: "bg-emerald-50", fg: "text-emerald-600" },
  { href: "/services",   label: "心理服務", icon: "services",   bg: "bg-sky-50",     fg: "text-sky-500" },
  {
    href: "/team", label: "專業團隊", icon: "team", bg: "bg-violet-50", fg: "text-violet-500",
    children: [
      { href: "/team/tanky",    label: "唐國章 · Tanky" },
      { href: "/team/veronica", label: "Veronica" },
      { href: "/team/joyce",    label: "黃文靜 · Joyce" },
      { href: "/team/mfok",     label: "M Fok" },
    ],
  },
  { href: "/assessment", label: "心理自評", icon: "assessment", bg: "bg-amber-50",   fg: "text-amber-600" },
  { href: "/faq",        label: "常見問題", icon: "faq",        bg: "bg-slate-100",  fg: "text-slate-500" },
  { href: "/news",       label: "最新消息", icon: "news",       bg: "bg-rose-50",    fg: "text-rose-500" },
];

// ── Bottom tabs ──────────────────────────────────────────────────────────────
type BottomTab = { href?: string; label: string; icon: string; isMenu?: boolean };

const BOTTOM_TABS: BottomTab[] = [
  { href: "/",           label: "首頁", icon: "home" },
  { href: "/services",   label: "服務", icon: "services" },
  { href: "/booking",    label: "預約", icon: "booking" },
  { href: "/assessment", label: "自評", icon: "assessment" },
  { label: "選單", icon: "menu", isMenu: true },
];

// ── Component ────────────────────────────────────────────────────────────────
export default function Navbar() {
  const [scrolled, setScrolled]       = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [teamOpen, setTeamOpen]       = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setTeamOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const navBg = isHome && !scrolled
    ? "bg-transparent"
    : "bg-paper/95 backdrop-blur-sm border-b border-sand/20";
  const textColor   = isHome && !scrolled ? "text-paper" : "text-deep";
  const logoVariant = isHome && !scrolled ? "light" : "dark";
  const isTeamActive = pathname.startsWith("/team");

  return (
    <>
      {/* ── Top header ─────────────────────────────────────────────────── */}
      <header className={cn("fixed top-0 left-0 right-0 z-50 transition-all duration-300", navBg)}>
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex-shrink-0 block cursor-pointer">
            <Logo variant={logoVariant} className="h-11 sm:h-12 w-auto" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8 ml-auto">
            <ul className="flex items-center gap-6">
              {NAV_LINKS.map((link) => (
                <li key={link.href} ref={link.children ? dropdownRef : undefined} className="relative">
                  {link.children ? (
                    <>
                      <button
                        type="button"
                        aria-haspopup="true"
                        aria-expanded={dropdownOpen}
                        onClick={() => setDropdownOpen((o) => !o)}
                        onKeyDown={(e) => { if (e.key === "Escape") setDropdownOpen(false); }}
                        className={cn(
                          "text-[13px] font-sans tracking-widest transition-colors duration-200 relative inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0",
                          isTeamActive ? "text-sand" : textColor,
                          !isTeamActive && "hover:text-sand"
                        )}
                      >
                        {link.label}
                        <svg className={cn("w-2.5 h-2.5 transition-transform duration-200", dropdownOpen && "rotate-180")} viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                          <path d="M1 1l4 4 4-4" />
                        </svg>
                        <span className={cn("absolute -bottom-0.5 left-0 h-px bg-sand transition-all duration-300", isTeamActive || dropdownOpen ? "w-[calc(100%-1rem)]" : "w-0")} />
                      </button>
                      <div role="menu" aria-hidden={!dropdownOpen} className={cn("absolute top-full left-1/2 -translate-x-1/2 pt-3 transition-all duration-200", dropdownOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}>
                        <div className="bg-paper/98 backdrop-blur-sm border border-sand/20 shadow-lg min-w-[140px] py-2">
                          <Link href="/team" role="menuitem" onClick={() => setDropdownOpen(false)} onKeyDown={(e) => { if (e.key === "Escape") setDropdownOpen(false); }} className="block px-5 py-2 text-xs font-sans tracking-widest text-muted hover:text-forest hover:bg-soft transition-colors border-b border-sand/10">
                            所有成員
                          </Link>
                          {link.children.map((child) => (
                            <Link key={child.href} href={child.href} role="menuitem" onClick={() => setDropdownOpen(false)} onKeyDown={(e) => { if (e.key === "Escape") setDropdownOpen(false); }} className={cn("block px-5 py-2.5 text-xs font-sans tracking-wide transition-colors", pathname === child.href ? "text-forest bg-soft" : "text-deep hover:text-forest hover:bg-soft")}>
                              <span className="block">{child.label}</span>
                              {child.sub && <span className="block font-garamond text-xs text-muted/70 mt-0.5">{child.sub}</span>}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <Link href={link.href} className={cn("text-[13px] font-sans tracking-widest transition-colors duration-200 relative group", textColor, pathname === link.href ? "text-sand" : "hover:text-sand")}>
                      {link.label}
                      <span className={cn("absolute -bottom-0.5 left-0 h-px bg-sand transition-all duration-300", pathname === link.href ? "w-full" : "w-0 group-hover:w-full")} />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <Link href="/booking" className={cn("px-4 py-1.5 border transition-all duration-300 text-[11px] tracking-widest font-sans cursor-pointer rounded-xs", isHome && !scrolled ? "border-paper/45 text-paper hover:bg-paper hover:text-deep" : "border-forest/50 text-forest hover:bg-forest hover:text-paper")}>
              預約諮商輔導
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Mobile: backdrop ────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 md:hidden bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMenuOpen(false)}
      />

      {/* ── Mobile: drawer sheet ────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="導覽選單"
        aria-hidden={!menuOpen}
        className={cn(
          "fixed left-0 right-0 z-50 md:hidden bg-paper rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out overflow-y-auto",
          menuOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom))", maxHeight: "72vh" }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-sand/30" />
        </div>

        <div className="px-4 pb-6 pt-1">
          {DRAWER_ITEMS.map((item) => (
            <div key={item.href}>
              {item.children ? (
                <>
                  <button
                    type="button"
                    onClick={() => setTeamOpen((o) => !o)}
                    className="flex items-center w-full gap-3 px-2 py-3 rounded-xl hover:bg-soft transition-colors"
                  >
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", item.bg, item.fg)}>
                      <NavIcon name={item.icon} className="w-[18px] h-[18px]" />
                    </div>
                    <span className={cn("flex-1 text-left text-sm font-sans", isTeamActive ? "text-forest font-medium" : "text-deep")}>
                      {item.label}
                    </span>
                    <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" className={cn("w-2.5 h-2.5 text-muted/40 transition-transform duration-200", teamOpen && "rotate-180")} aria-hidden="true">
                      <path d="M1 1l4 4 4-4" />
                    </svg>
                  </button>
                  <div className={cn("overflow-hidden transition-all duration-200", teamOpen ? "max-h-52" : "max-h-0")}>
                    <div className="ml-12 mb-1 space-y-0.5 border-l border-sand/15 pl-3">
                      <Link href="/team" onClick={() => setMenuOpen(false)} className="block py-2 text-xs font-sans text-muted hover:text-forest transition-colors">
                        所有成員
                      </Link>
                      {item.children.map((child) => (
                        <Link key={child.href} href={child.href} onClick={() => setMenuOpen(false)} className={cn("block py-2 text-xs font-sans transition-colors", pathname === child.href ? "text-forest font-medium" : "text-muted hover:text-forest")}>
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-soft transition-colors"
                >
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", item.bg, item.fg)}>
                    <NavIcon name={item.icon} className="w-[18px] h-[18px]" />
                  </div>
                  <span className={cn("text-sm font-sans", pathname === item.href ? "text-forest font-medium" : "text-deep")}>
                    {item.label}
                  </span>
                </Link>
              )}
            </div>
          ))}

          {/* Booking CTA */}
          <div className="mt-3 pt-3 border-t border-sand/15">
            <Link
              href="/booking"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-forest text-paper text-sm font-sans tracking-wider rounded-xl hover:bg-deep transition-colors"
            >
              <NavIcon name="booking" className="w-4 h-4" />
              預約諮商輔導
            </Link>
          </div>
        </div>
      </div>

      {/* ── Mobile: bottom tab bar ──────────────────────────────────────── */}
      <nav
        aria-label="底部導覽列"
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-paper/95 backdrop-blur-sm border-t border-sand/20"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around px-1 py-1.5">
          {BOTTOM_TABS.map((tab) => {
            if (tab.isMenu) {
              return (
                <button
                  key="menu"
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label={menuOpen ? "關閉選單" : "開啟選單"}
                  aria-expanded={menuOpen}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[44px] min-h-[44px] justify-center cursor-pointer"
                >
                  <span className={cn("transition-colors", menuOpen ? "text-forest" : "text-muted/50")}>
                    <NavIcon name={menuOpen ? "close" : "menu"} />
                  </span>
                  <span className={cn("text-[10px] font-sans transition-colors", menuOpen ? "text-forest" : "text-muted/50")}>
                    {menuOpen ? "關閉" : tab.label}
                  </span>
                </button>
              );
            }
            const isActive = tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href!);
            return (
              <Link
                key={tab.href}
                href={tab.href!}
                onClick={() => setMenuOpen(false)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[44px] min-h-[44px] justify-center"
              >
                <span className={cn("transition-colors", isActive ? "text-forest" : "text-muted/50")}>
                  <NavIcon name={tab.icon} />
                </span>
                <span className={cn("text-[10px] font-sans transition-colors", isActive ? "text-forest font-medium" : "text-muted/50")}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
