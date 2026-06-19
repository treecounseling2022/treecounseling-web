"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Props = {
  pendingInquiries: number;
  pendingAppointments: number;
  role: string;
};

export function NotificationBell({ pendingInquiries, pendingAppointments, role }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const total = pendingInquiries + pendingAppointments;

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="通知"
        aria-expanded={open}
        aria-haspopup="true"
        className="relative p-1.5 text-paper/60 hover:text-paper hover:bg-paper/10 rounded transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path d="M10 2a6 6 0 00-6 6v2.586l-.707.707A1 1 0 004 13h12a1 1 0 00.707-1.707L16 10.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
        </svg>
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 rounded-full bg-red-500 text-white text-[8px] font-medium flex items-center justify-center px-0.5 leading-none">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-sand/20 shadow-sm z-50 py-1">
          <p className="font-sans text-[10px] text-muted/60 px-3 py-1.5 border-b border-sand/10 uppercase tracking-wide">
            待處理
          </p>

          {pendingInquiries > 0 && (
            <Link
              href="/admin/inquiries"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 hover:bg-sand/10 transition-colors"
            >
              <span className="font-sans text-xs text-deep">新申請</span>
              <span className="font-sans text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none">
                {pendingInquiries}
              </span>
            </Link>
          )}

          {pendingAppointments > 0 && (
            <Link
              href="/admin/appointments"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 hover:bg-sand/10 transition-colors"
            >
              <span className="font-sans text-xs text-deep">
                {role === "therapist" ? "待確認預約" : "待排案預約"}
              </span>
              <span className="font-sans text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none">
                {pendingAppointments}
              </span>
            </Link>
          )}

          {total === 0 && (
            <p className="font-sans text-xs text-muted/40 px-3 py-3 text-center">
              目前沒有待處理事項
            </p>
          )}
        </div>
      )}
    </div>
  );
}
