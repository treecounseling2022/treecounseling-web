"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

type AdminThemeCtx = { isDark: boolean; mounted: boolean; toggle: () => void };

const AdminThemeContext = createContext<AdminThemeCtx>({
  isDark: false,
  mounted: false,
  toggle: () => {},
});

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const dark = localStorage.getItem("admin-theme") === "dark";
    setIsDark(dark);
    setMounted(true);
    document.documentElement.setAttribute("data-admin-theme", dark ? "dark" : "light");
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("admin-theme", next ? "dark" : "light");
    document.documentElement.setAttribute("data-admin-theme", next ? "dark" : "light");
  }

  return (
    <AdminThemeContext.Provider value={{ isDark, mounted, toggle }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}
