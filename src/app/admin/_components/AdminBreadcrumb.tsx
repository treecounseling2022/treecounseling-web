"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SEGMENT_LABELS: Record<string, string> = {
  admin: "後台",
  appointments: "預約派案",
  calendar: "行事曆",
  clients: "個案管理",
  members: "成員",
  rooms: "空間",
  salary: "薪酬計算",
  sessions: "晤談紀錄",
  articles: "文章",
  invite: "邀請成員",
  inquiries: "申請佇列",
  "service-plans": "方案設定",
  workshops: "講座",
  receipts: "收據",
  "my-salary": "我的薪酬",
  new: "新增",
  print: "列印",
};

export default function AdminBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const isId = /^[0-9a-f-]{8,}$/.test(seg) || (seg.length > 12 && !SEGMENT_LABELS[seg]);
    const label = SEGMENT_LABELS[seg] ?? (isId ? "詳情" : seg);
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav
      aria-label="麵包屑導覽"
      className="flex items-center gap-2 font-sans text-xs mb-6 flex-wrap"
      style={{ letterSpacing: "0.01em" }}
    >
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-2">
          {i > 0 && (
            <span aria-hidden="true" className="text-muted/25 select-none">›</span>
          )}
          {crumb.isLast ? (
            <span className="text-deep font-medium">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted/40 hover:text-muted/70 transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
