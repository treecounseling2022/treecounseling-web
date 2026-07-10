import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 將使用者輸入轉義後才能安全地內插進 email HTML，避免 HTML/連結注入。
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 取得澳門時區（Asia/Macau, UTC+8）「今天」的日期字串（YYYY-MM-DD）。
 * 不可用 `new Date().toISOString().slice(0, 10)` 取代——那會是 UTC 日期，
 * 在澳門時間 00:00–07:59 之間會算成前一天。
 */
export function todayInMacau(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Macau" }).format(new Date());
}

/**
 * 取得心理師的偏好顯示名稱：英文名優先，無英文名才用全名。
 * 例："唐國章 Tanky" → "Tanky"，"黃文靜 Joyce" → "Joyce"，"Veronica" → "Veronica"
 * 用於 Google Calendar 事件標題、個案確認 Email 等對外顯示場合。
 */
export function getTherapistDisplayName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  const englishPart = parts.find((p) => /^[A-Za-z][A-Za-z\s.'-]*$/.test(p));
  return englishPart ?? fullName;
}
