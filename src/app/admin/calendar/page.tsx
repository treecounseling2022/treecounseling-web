"use client";

import { useState, useEffect, useCallback } from "react";

type Appointment = {
  id: string;
  scheduled_at: string | null;
  booking_status: string;
  is_online: boolean;
  session_fee: number | null;
  duration_minutes: number | null;
  clients: { id: string; full_name: string } | null;
  rooms: { name: string; color: string } | null;
  therapist_id: string | null;
};

type Workshop = {
  id: string;
  title: string;
  scheduled_at: string;
  therapist_id: string;
  status: string;
};

type CalendarEvent =
  | { kind: "appt"; data: Appointment }
  | { kind: "workshop"; data: Workshop };

const STATUS_COLOR: Record<string, string> = {
  pending_admin: "#f59e0b",
  pending_therapist: "#3b82f6",
  confirmed: "#16a34a",
  locked: "#6b7280",
  cancelled: "#d1d5db",
};

const STATUS_LABEL: Record<string, string> = {
  pending_admin: "待排案",
  pending_therapist: "待心理師確認",
  confirmed: "已確認",
  locked: "鎖定",
  cancelled: "已取消",
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
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [therapistMap, setTherapistMap] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Date | null>(null);
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);

  const load = useCallback(async () => {
    const [apptRes, wsRes] = await Promise.all([
      fetch("/api/admin/appointments"),
      fetch("/api/admin/workshops"),
    ]);
    if (apptRes.ok) {
      const json = await apptRes.json();
      setAppointments(json.appointments ?? []);
      setTherapistMap(json.therapistMap ?? {});
    }
    if (wsRes.ok) {
      const json = await wsRes.json();
      setWorkshops((json.workshops ?? []).filter((w: Workshop) => w.status !== "cancelled"));
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

  // Group appointments and workshops by day
  const eventsByDay: Record<number, CalendarEvent[]> = {};

  appointments.forEach((a) => {
    if (!a.scheduled_at) return;
    const d = new Date(a.scheduled_at);
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    if (a.booking_status === "cancelled") return;
    const day = d.getDate();
    if (!eventsByDay[day]) eventsByDay[day] = [];
    eventsByDay[day].push({ kind: "appt", data: a });
  });

  workshops.forEach((w) => {
    const d = new Date(w.scheduled_at);
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    const day = d.getDate();
    if (!eventsByDay[day]) eventsByDay[day] = [];
    eventsByDay[day].push({ kind: "workshop", data: w });
  });

  const selectedDay = selected?.getDate();
  const selectedEvents: CalendarEvent[] = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];

  return (
    <div className="space-y-6 pt-4">
      <div>
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
            const dayEvents = day ? (eventsByDay[day] ?? []) : [];
            const weekday = idx % 7;

            return (
              <div
                key={idx}
                role={day ? "button" : undefined}
                tabIndex={day ? 0 : undefined}
                onClick={() => {
                  if (!day) return;
                  setSelected(isSelected ? null : new Date(year, month, day));
                }}
                onKeyDown={(e) => {
                  if (!day) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(isSelected ? null : new Date(year, month, day));
                  }
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
                      {dayEvents.slice(0, 3).map((ev) => {
                        if (ev.kind === "appt") {
                          const a = ev.data;
                          return (
                            <div
                              key={`a-${a.id}`}
                              className="font-sans text-[9px] px-1 py-0.5 rounded truncate text-white"
                              style={{ backgroundColor: STATUS_COLOR[a.booking_status] ?? "#9ca3af" }}
                              title={`${a.clients?.full_name} · ${a.rooms?.name ?? ""}`}
                            >
                              {new Date(a.scheduled_at!).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Macau" })}
                              {" "}{a.clients?.full_name}
                            </div>
                          );
                        }
                        const w = ev.data;
                        return (
                          <div
                            key={`w-${w.id}`}
                            className="font-sans text-[9px] px-1 py-0.5 rounded truncate text-white"
                            style={{ backgroundColor: "#7c3aed" }}
                            title={`講座：${w.title}`}
                          >
                            {new Date(w.scheduled_at).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Macau" })}
                            {" "}♦ {w.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="font-sans text-[9px] text-muted/60 px-1">
                          +{dayEvents.length - 3} 筆
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
            {year} 年 {MONTHS[month]} {selectedDay} 日 — {selectedEvents.length} 筆活動
          </h3>
          {selectedEvents.length === 0 && (
            <p className="font-sans text-xs text-muted/40">此日無預約或活動。</p>
          )}
          <div className="space-y-1.5">
            {selectedEvents.map((ev) => {
              if (ev.kind === "appt") {
                const a = ev.data;
                return (
                  <button
                    key={`a-${a.id}`}
                    onClick={() => setDetailAppt(a)}
                    className="w-full flex items-center gap-3 font-sans text-sm px-3 py-2.5 rounded hover:bg-sand/10 transition-colors text-left"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: a.rooms?.color ?? STATUS_COLOR[a.booking_status] }}
                    />
                    <span className="text-deep font-medium">
                      {new Date(a.scheduled_at!).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Macau" })}
                    </span>
                    <span className="text-muted">{a.clients?.full_name}</span>
                    {a.rooms && <span className="text-muted/60 text-xs">{a.rooms.name}</span>}
                    <span className="text-[10px] px-1.5 py-0.5 ml-auto flex-shrink-0"
                      style={{ background: `${STATUS_COLOR[a.booking_status]}18`, color: STATUS_COLOR[a.booking_status] }}>
                      {STATUS_LABEL[a.booking_status] ?? a.booking_status}
                    </span>
                    {a.therapist_id && (
                      <span className="text-muted/60 text-xs flex-shrink-0">
                        {therapistMap[a.therapist_id] ?? ""}
                      </span>
                    )}
                  </button>
                );
              }
              const w = ev.data;
              return (
                <div key={`w-${w.id}`} className="flex items-center gap-3 font-sans text-sm px-3 py-2.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#7c3aed" }} />
                  <span className="text-deep font-medium">
                    {new Date(w.scheduled_at).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Macau" })}
                  </span>
                  <span className="text-muted">♦ {w.title}</span>
                  <span className="font-sans text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 ml-auto">講座</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Appointment detail modal */}
      {detailAppt && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={() => setDetailAppt(null)}
        >
          <div
            className="bg-white border border-sand/20 w-full max-w-sm shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-sand/10">
              <h3 className="font-serif text-deep text-lg">預約詳情</h3>
              <button onClick={() => setDetailAppt(null)} className="text-muted/40 hover:text-muted text-xl leading-none">×</button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {[
                {
                  label: "個案",
                  value: detailAppt.clients?.full_name ?? "—",
                  href: detailAppt.clients?.id ? `/admin/clients/${detailAppt.clients.id}` : null,
                },
                {
                  label: "時間",
                  value: detailAppt.scheduled_at
                    ? new Date(detailAppt.scheduled_at).toLocaleString("zh-TW", {
                        year: "numeric", month: "long", day: "numeric",
                        weekday: "short", hour: "2-digit", minute: "2-digit",
                        timeZone: "Asia/Macau",
                      })
                    : "（待定）",
                },
                {
                  label: "心理師",
                  value: detailAppt.therapist_id ? (therapistMap[detailAppt.therapist_id] ?? "—") : "—",
                },
                { label: "診室", value: detailAppt.rooms?.name ?? "—" },
                { label: "方式", value: detailAppt.is_online ? "線上（視訊）" : "到診面談" },
                {
                  label: "費用",
                  value: detailAppt.session_fee != null ? `MOP ${detailAppt.session_fee}` : "—",
                },
                {
                  label: "時長",
                  value: detailAppt.duration_minutes ? `${detailAppt.duration_minutes} 分鐘` : "—",
                },
                { label: "狀態", value: STATUS_LABEL[detailAppt.booking_status] ?? detailAppt.booking_status },
              ].map(({ label, value, href }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="font-sans text-[11px] text-muted/60 w-14 flex-shrink-0 pt-0.5">{label}</span>
                  {href ? (
                    <a href={href} className="font-sans text-sm text-forest hover:underline">{value}</a>
                  ) : (
                    <span className="font-sans text-sm text-deep">{value}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-sand/10 flex justify-between items-center">
              <a
                href={`/admin/appointments`}
                className="font-sans text-xs text-forest hover:underline"
              >
                前往預約管理 →
              </a>
              <button
                onClick={() => setDetailAppt(null)}
                className="font-sans text-xs px-4 py-2 bg-sand/20 text-muted hover:bg-sand/30 transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
