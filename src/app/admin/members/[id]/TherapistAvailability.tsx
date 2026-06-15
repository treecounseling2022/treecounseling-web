"use client";

import { useState } from "react";

type Slot = {
  id: string;
  therapist_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

const DAY_LABELS = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sun display order

export default function TherapistAvailability({
  therapistId,
  initialSlots,
}: {
  therapistId: string;
  initialSlots: Slot[];
}) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [adding, setAdding] = useState<number | null>(null); // day_of_week being added
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("18:00");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function addSlot(day: number) {
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/therapist-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapist_id: therapistId,
          day_of_week: day,
          start_time: newStart,
          end_time: newEnd,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "新增失敗"); return; }
      setSlots((prev) => [...prev, data].sort((a, b) =>
        a.day_of_week !== b.day_of_week ? a.day_of_week - b.day_of_week : a.start_time.localeCompare(b.start_time)
      ));
      setAdding(null);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(slot: Slot) {
    const res = await fetch("/api/admin/therapist-availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: slot.id, is_active: !slot.is_active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSlots((prev) => prev.map((s) => s.id === slot.id ? updated : s));
    }
  }

  async function deleteSlot(id: string) {
    if (!confirm("確定刪除此時段？")) return;
    const res = await fetch(`/api/admin/therapist-availability?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setSlots((prev) => prev.filter((s) => s.id !== id));
    }
  }

  function fmtTime(t: string) {
    return t.slice(0, 5); // "HH:MM"
  }

  const inputCls = "border border-sand/30 px-2 py-1 font-sans text-sm text-deep focus:outline-none focus:border-forest/50";

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-deep text-lg">可諮詢時段</h2>

      {err && <p className="font-sans text-xs text-red-500">{err}</p>}

      <div className="space-y-3">
        {DAY_ORDER.map((day) => {
          const daySlots = slots.filter((s) => s.day_of_week === day);
          const isAddingThisDay = adding === day;

          return (
            <div key={day} className="bg-white border border-sand/20">
              <div className="flex items-center justify-between px-4 py-2 border-b border-sand/10 bg-sand/5">
                <span className="font-sans text-sm font-medium text-deep">{DAY_LABELS[day]}</span>
                {!isAddingThisDay && (
                  <button
                    onClick={() => {
                      setAdding(day);
                      setNewStart("09:00");
                      setNewEnd("18:00");
                      setErr("");
                    }}
                    className="font-sans text-[11px] text-muted/60 hover:text-forest transition-colors"
                  >
                    + 新增時段
                  </button>
                )}
              </div>

              <div className="divide-y divide-sand/10">
                {daySlots.length === 0 && !isAddingThisDay && (
                  <p className="font-sans text-[11px] text-muted/40 px-4 py-2">無可用時段</p>
                )}

                {daySlots.map((slot) => (
                  <div key={slot.id} className="flex items-center gap-3 px-4 py-2">
                    <span className={`font-sans text-sm ${slot.is_active ? "text-deep" : "text-muted/40 line-through"}`}>
                      {fmtTime(slot.start_time)} – {fmtTime(slot.end_time)}
                    </span>
                    <div className="flex gap-2 ml-auto">
                      <button
                        onClick={() => toggleActive(slot)}
                        className={`font-sans text-[10px] px-2 py-0.5 border transition-colors ${
                          slot.is_active
                            ? "border-forest/30 text-forest hover:bg-forest/5"
                            : "border-sand/30 text-muted/50 hover:bg-sand/10"
                        }`}
                      >
                        {slot.is_active ? "啟用中" : "已停用"}
                      </button>
                      <button
                        onClick={() => deleteSlot(slot.id)}
                        className="font-sans text-[10px] text-red-400 hover:text-red-600 transition-colors"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                ))}

                {isAddingThisDay && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-sand/5">
                    <input
                      type="time"
                      value={newStart}
                      onChange={(e) => setNewStart(e.target.value)}
                      className={inputCls}
                    />
                    <span className="font-sans text-sm text-muted">–</span>
                    <input
                      type="time"
                      value={newEnd}
                      onChange={(e) => setNewEnd(e.target.value)}
                      className={inputCls}
                    />
                    <button
                      onClick={() => addSlot(day)}
                      disabled={saving}
                      className="font-sans text-xs px-3 py-1 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors"
                    >
                      {saving ? "儲存…" : "確認"}
                    </button>
                    <button
                      onClick={() => { setAdding(null); setErr(""); }}
                      className="font-sans text-xs text-muted/60 hover:text-muted transition-colors"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="font-sans text-[10px] text-muted/40">時段設定供排案參考，不自動限制預約。</p>
    </div>
  );
}
