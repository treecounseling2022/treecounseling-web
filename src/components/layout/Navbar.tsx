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

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
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

  // 點擊外部關閉桌面版下拉選單
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navBg = isHome && !scrolled
    ? "bg-transparent"
    : "bg-paper/95 backdrop-blur-sm border-b border-sand/20";

  const textColor = isHome && !scrolled ? "text-paper" : "text-deep";
  const logoVariant = isHome && !scrolled ? "light" : "dark";

  const isTeamActive = pathname.startsWith("/team");

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        navBg
      )}
    >
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 block cursor-pointer">
          <Logo variant={logoVariant} className="h-11 sm:h-12 w-auto" />
        </Link>

        {/* Desktop Nav */}
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
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setDropdownOpen(false);
                      }}
                      className={cn(
                        "text-[13px] font-sans tracking-widest transition-colors duration-200 relative inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0",
                        isTeamActive ? "text-sand" : textColor,
                        !isTeamActive && "hover:text-sand"
                      )}
                    >
                      {link.label}
                      <svg
                        className={cn("w-2.5 h-2.5 transition-transform duration-200", dropdownOpen && "rotate-180")}
                        viewBox="0 0 10 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden="true"
                      >
                        <path d="M1 1l4 4 4-4" />
                      </svg>
                      <span
                        className={cn(
                          "absolute -bottom-0.5 left-0 h-px bg-sand transition-all duration-300",
                          isTeamActive || dropdownOpen ? "w-[calc(100%-1rem)]" : "w-0"
                        )}
                      />
                    </button>

                    {/* Dropdown */}
                    <div
                      role="menu"
                      aria-hidden={!dropdownOpen}
                      className={cn(
                        "absolute top-full left-1/2 -translate-x-1/2 pt-3 transition-all duration-200",
                        dropdownOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                      )}
                    >
                      <div className="bg-paper/98 backdrop-blur-sm border border-sand/20 shadow-lg min-w-[140px] py-2">
                        <Link
                          href="/team"
                          role="menuitem"
                          onClick={() => setDropdownOpen(false)}
                          onKeyDown={(e) => { if (e.key === "Escape") setDropdownOpen(false); }}
                          className="block px-5 py-2 text-xs font-sans tracking-widest text-muted hover:text-forest hover:bg-soft transition-colors border-b border-sand/10"
                        >
                          所有成員
                        </Link>
                        {link.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            role="menuitem"
                            onClick={() => setDropdownOpen(false)}
                            onKeyDown={(e) => { if (e.key === "Escape") setDropdownOpen(false); }}
                            className={cn(
                              "block px-5 py-2.5 text-xs font-sans tracking-wide transition-colors",
                              pathname === child.href
                                ? "text-forest bg-soft"
                                : "text-deep hover:text-forest hover:bg-soft"
                            )}
                          >
                            <span className="block">{child.label}</span>
                            {child.sub && (
                              <span className="block font-garamond text-xs text-muted/70 mt-0.5">
                                {child.sub}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <Link
                    href={link.href}
                    className={cn(
                      "text-[13px] font-sans tracking-widest transition-colors duration-200 relative group",
                      textColor,
                      pathname === link.href ? "text-sand" : "hover:text-sand"
                    )}
                  >
                    {link.label}
                    <span
                      className={cn(
                        "absolute -bottom-0.5 left-0 h-px bg-sand transition-all duration-300",
                        pathname === link.href ? "w-full" : "w-0 group-hover:w-full"
                      )}
                    />
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <Link
            href="/booking"
            className={cn(
              "px-4 py-1.5 border transition-all duration-300 text-[11px] tracking-widest font-sans cursor-pointer rounded-xs",
              isHome && !scrolled
                ? "border-paper/45 text-paper hover:bg-paper hover:text-deep"
                : "border-forest/50 text-forest hover:bg-forest hover:text-paper"
            )}
          >
            預約諮商輔導
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={cn("md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer", textColor)}
          aria-label={menuOpen ? "關閉選單" : "開啟選單"}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-menu"
        >
          <span className="block w-5 h-px bg-current mb-1.5 transition-all" />
          <span className={cn("block w-5 h-px bg-current mb-1.5 transition-all", menuOpen && "opacity-0")} />
          <span className="block w-5 h-px bg-current transition-all" />
        </button>
      </nav>

      {/* Mobile Menu */}
      <div
        id="mobile-nav-menu"
        className={cn(
          "md:hidden overflow-hidden transition-all duration-300 bg-paper border-t border-sand/20",
          menuOpen ? "max-h-[560px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <ul className="px-6 py-4 space-y-4">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              {link.children ? (
                <div>
                  <button
                    onClick={() => setTeamOpen(!teamOpen)}
                    aria-expanded={teamOpen}
                    aria-controls="mobile-team-submenu"
                    className={cn(
                      "flex items-center justify-between w-full text-sm font-sans transition-colors py-2",
                      isTeamActive ? "text-sand" : "text-deep hover:text-sand"
                    )}
                  >
                    <span>{link.label}</span>
                    <svg
                      className={cn(
                        "w-3 h-3 transition-transform duration-200",
                        teamOpen && "rotate-180"
                      )}
                      viewBox="0 0 10 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M1 1l4 4 4-4" />
                    </svg>
                  </button>
                  <div
                    id="mobile-team-submenu"
                    className={cn(
                      "overflow-hidden transition-all duration-200",
                      teamOpen ? "max-h-60 mt-2" : "max-h-0"
                    )}
                  >
                    <ul className="pl-4 space-y-2 border-l border-sand/20">
                      <li>
                        <Link
                          href="/team"
                          className="block text-xs font-sans text-muted hover:text-forest transition-colors py-2.5"
                        >
                          所有成員
                        </Link>
                      </li>
                      {link.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={cn(
                              "block text-xs font-sans transition-colors py-2.5",
                              pathname === child.href
                                ? "text-forest"
                                : "text-muted hover:text-forest"
                            )}
                          >
                            {child.label}
                            {child.sub && (
                              <span className="font-garamond text-muted/60 ml-1.5">
                                {child.sub}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <Link
                  href={link.href}
                  className={cn(
                    "block text-sm font-sans text-deep transition-colors py-2",
                    pathname === link.href ? "text-sand" : "hover:text-sand"
                  )}
                >
                  {link.label}
                </Link>
              )}
            </li>
          ))}
          <li className="pt-3 border-t border-sand/15">
            <Link
              href="/booking"
              className="block text-center py-3 bg-forest hover:bg-deep text-paper text-xs font-sans tracking-widest transition-colors cursor-pointer"
            >
              預約諮商輔導
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
