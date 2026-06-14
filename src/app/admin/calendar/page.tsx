"use client";

import { useState, useEffect, useCallback } from "react";

type Appointment = {
  id: string;
  scheduled_at: string | null;
  booking_status: string;
  clients: { full_name: string } | null;
  rooms: { name: string; color: string } | null;
  therapist_id: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  pending_admin: "#f59e0b",
  pending_therapist: "#3b82f6",
  confirmed: "#16a34a",
  locked: "#6b7280",
  cancelled: "#d1d5db",
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

function startOfMonth(y: number, m: number) {
  return new Date(y, m, 1);
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [therapistMap, setTherapistMap] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/appointments");
    if (res.ok) {
      const json = await res.json();
      setAppointments(json.appointments ?? []);
      setTherapistMap(json.therapistMap ?? {});
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  // Build calendar grid
  const firstDay = startOfMonth(year, month);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  // Group appointments by day
  const apptsByDay: Record<number, Appointment[]> = {};
  appointments.forEach((a) => {
    if (!a.scheduled_at) return;
    const d = new Date(a.scheduled_at);
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    if (a.booking_status === "cancelled") return;
    const day = d.getDate();
    if (!apptsByDay[day]) apptsByDay[day] = [];
    apptsByDay[day].push(a);
  });

  const selectedDay = selected?.getDate();
  const selectedAppts = selectedDay ? (apptsByDay[selectedDay] ?? []) : [];

  return (
    <div className="space-y-6 pt-4">
      <div>
        <p className="font-sans text-xs text-muted mb-1">
          <a href="/admin" className="hover:text-forest">後台</a> / 行事曆
        </p>
        <h1 className="font-serif text-deep text-2xl">行事曆</h1>
        <p className="font-sans text-xs text-muted mt-0.5">
          顯示所有已排定的預約時間。
        </p>
      </div>

      <div className="bg-white border border-sand/20 overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-sand/20">
          <button onClick={prevMonth} className="font-sans text-sm text-muted hover:text-deep transition-colors px-2">‹</button>
          <h2 className="font-serif text-deep text-lg">
            {year} 年 {MONTHS[month]}
          </h2>
          <button onClick={nextMonth} className="font-sans text-sm text-muted hover:text-deep transition-colors px-2">›</button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-sand/10">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={`py-2 text-center font-sans text-[11px] text-muted/60 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : ""}`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const isSelected = day === selectedDay;
            const dayAppts = day ? (apptsByDay[day] ?? []) : [];
            const weekday = idx % 7;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (!day) return;
                  setSelected(isSelected ? null : new Date(year, month, day));
                }}
                className={`min-h-[72px] border-b border-r border-sand/10 p-1.5 transition-colors ${
                  day
                    ? isSelected
                      ? "bg-deep/5 cursor-pointer"
                      : "hover:bg-sand/5 cursor-pointer"
                    : "bg-sand/5"
                }`}
              >
                {day && (
                  <>
                    <span
                      className={`font-sans text-xs inline-block w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                        isToday
                          ? "bg-deep text-paper font-medium"
                          : weekday === 0
                          ? "text-red-400"
                          : weekday === 6
                          ? "text-blue-400"
                          : "text-muted"
                      }`}
                    >
                      {day}
                    </span>
                    <div className="space-y-0.5">
                      {dayAppts.slice(0, 3).map((a) => (
                        <div
                          key={a.id}
                          className="font-sans text-[9px] px-1 py-0.5 rounded truncate text-white"
                          style={{ backgroundColor: STATUS_COLOR[a.booking_status] ?? "#9ca3af" }}
                          title={`${a.clients?.full_name} · ${a.rooms?.name ?? ""}`}
                        >
                          {new Date(a.scheduled_at!).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                          {" "}{a.clients?.full_name}
                        </div>
                      ))}
                      {dayAppts.length > 3 && (
                        <div className="font-sans text-[9px] text-muted/60 px-1">
                          +{dayAppts.length - 3} 筆
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selected && (
        <div className="bg-white border border-sand/20 p-4 space-y-3">
          <h3 className="font-serif text-deep">
            {year} 年 {MONTHS[month]} {selectedDay} 日 — {selectedAppts.length} 筆預約
          </h3>
          {selectedAppts.length === 0 && (
            <p className="font-sans text-xs text-muted/40">此日無預約。</p>
          )}
          <div className="space-y-2">
            {selectedAppts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 font-sans text-sm">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: a.rooms?.color ?? STATUS_COLOR[a.booking_status] }}
                />
                <span className="text-deep font-medium">
                  {new Date(a.scheduled_at!).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-muted">{a.clients?.full_name}</span>
                {a.rooms && <span className="text-muted/60 text-xs">{a.rooms.name}</span>}
                {a.therapist_id && (
                  <span className="text-muted/60 text-xs ml-auto">
                    {therapistMap[a.therapist_id] ?? ""}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Google Calendar sync notice */}
      <div className="bg-sand/10 border border-sand/20 px-4 py-3 flex items-start gap-3">
        <span className="text-lg flex-shrink-0">📅</span>
        <div>
          <p className="font-sans text-xs text-deep font-medium">Google Calendar 同步</p>
          <p className="font-sans text-[11px] text-muted mt-0.5">
            即將推出。需要在 .env.local 設定 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET，並在 Google Cloud Console 設定 OAuth 應用程式。
          </p>
        </div>
      </div>
    </div>
  );
}
