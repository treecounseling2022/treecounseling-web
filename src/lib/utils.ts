import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
