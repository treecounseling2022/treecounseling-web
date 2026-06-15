"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Room = { id: string; name: string; color: string; is_online?: boolean };
type Plan = { id: string; name: string; price_per_session: number; currency: string };

type Props = {
  clientId: string;
  clientName: string;
  rooms: Room[];
  plans: Plan[];
};

export default function NewAppointmentForm({ clientId, clientName, rooms, plans }: Props) {
  const router = useRouter();

  const defaultPlan = plans[0] ?? null;
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [planId, setPlanId] = useState(defaultPlan?.id ?? "");
  const [fee, setFee] = useState(defaultPlan?.price_per_session?.toString() ?? "");
  const [currency, setCurrency] = useState(defaultPlan?.currency ?? "MOP");
  const [roomId, setRoomId] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  function handlePlanChange(id: string) {
    setPlanId(id);
    const plan = plans.find((p) => p.id === id);
    if (plan) {
      setFee(plan.price_per_session.toString());
      setCurrency(plan.currency);
    } else {
      setFee("");
    }
  }

  function handleRoomChange(id: string) {
    setRoomId(id);
    const room = rooms.find((r) => r.id === id);
    // auto-check is_online when online room is selected
    if (room?.is_online) setIsOnline(true);
    else if (!room?.is_online && id) setIsOnline(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) { setErr("請選擇日期與時間"); return; }

    setSubmitting(true);
    setErr("");

    try {
      const scheduled_at = new Date(`${date}T${time}:00+08:00`).toISOString();

      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          scheduled_at,
          room_id: roomId || null,
          plan_id: planId || null,
          session_fee: fee ? parseFloat(fee) : null,
          is_online: isOnline,
          admin_notes: notes || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? "發生錯誤"); return; }

      router.push(`/admin/clients/${clientId}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50 bg-white";

  return (
    <form onSubmit={submit} className="space-y-5 bg-white border border-sand/20 p-6">
      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="font-sans text-[11px] text-muted block mb-1">日期 *</label>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className="font-sans text-[11px] text-muted block mb-1">時間 *</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className={inputCls}
          />
        </div>
      </div>

      {/* Service Plan → auto-fills fee */}
      <div>
        <label className="font-sans text-[11px] text-muted block mb-1">服務方案</label>
        <select
          value={planId}
          onChange={(e) => handlePlanChange(e.target.value)}
          className={inputCls}
        >
          <option value="">（不指定方案）</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.currency} {p.price_per_session}
            </option>
          ))}
        </select>
      </div>

      {/* Fee */}
      <div>
        <label className="font-sans text-[11px] text-muted block mb-1">費用</label>
        <div className="flex gap-2">
          <span className="border border-sand/30 px-3 py-2 font-sans text-sm text-muted bg-sand/10 flex-shrink-0">
            {currency}
          </span>
          <input
            type="number"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="0"
            min="0"
            step="0.5"
            className={inputCls}
          />
        </div>
      </div>

      {/* Room */}
      <div>
        <label className="font-sans text-[11px] text-muted block mb-1">諮商空間</label>
        <div className="flex items-center gap-2">
          {roomId && (() => {
            const room = rooms.find((r) => r.id === roomId);
            return room ? (
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: room.color }}
              />
            ) : null;
          })()}
          <select
            value={roomId}
            onChange={(e) => handleRoomChange(e.target.value)}
            className={inputCls}
          >
            <option value="">（未指定）</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* is_online checkbox */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={isOnline}
          onChange={(e) => setIsOnline(e.target.checked)}
          className="w-4 h-4 accent-forest"
        />
        <span className="font-sans text-sm text-deep group-hover:text-forest transition-colors">
          線上諮商輔導
        </span>
        {isOnline && (
          <span className="font-sans text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5">
            視訊進行
          </span>
        )}
      </label>

      {/* Notes */}
      <div>
        <label className="font-sans text-[11px] text-muted block mb-1">備註（行政可見）</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="排案備注、特殊說明…（選填）"
          className={inputCls + " resize-none"}
        />
      </div>

      {err && <p className="font-sans text-xs text-red-500">{err}</p>}

      <div className="flex items-center gap-3 pt-2 border-t border-sand/10">
        <button
          type="submit"
          disabled={submitting}
          className="font-sans text-sm px-6 py-2 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors"
        >
          {submitting ? "建立中…" : "建立預約"}
        </button>
        <a
          href={`/admin/clients/${clientId}`}
          className="font-sans text-xs text-muted hover:text-deep transition-colors"
        >
          取消
        </a>
      </div>
    </form>
  );
}
