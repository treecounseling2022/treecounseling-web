"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Client = { id: string; full_name: string };
type Room   = { id: string; name: string; color: string; is_online?: boolean };
type Plan   = { id: string; name: string; price_per_session: number; currency: string };
type CoupleInfo = { service_type: string; couple_partner_id: string | null; partner_name: string | null };

type Props = {
  clients: Client[];
  defaultClientId?: string;
  rooms: Room[];
  plans: Plan[];
  therapistMeetLink?: string;
};

export default function TherapistNewApptForm({ clients, defaultClientId, rooms, plans, therapistMeetLink = "" }: Props) {
  const router = useRouter();

  const defaultPlan = plans[0] ?? null;
  const today = new Date().toISOString().slice(0, 10);

  const [clientId,        setClientId]        = useState(defaultClientId ?? "");
  const [date,            setDate]            = useState("");
  const [time,            setTime]            = useState("10:00");
  const [planId,          setPlanId]          = useState(defaultPlan?.id ?? "");
  const [fee,             setFee]             = useState(defaultPlan?.price_per_session?.toString() ?? "");
  const [currency,        setCurrency]        = useState(defaultPlan?.currency ?? "MOP");
  const [roomId,          setRoomId]          = useState("");
  const [isOnline,        setIsOnline]        = useState(false);
  const [meetingLink,     setMeetingLink]     = useState("");
  const [useCustomLink,   setUseCustomLink]   = useState(false);
  const [notes,           setNotes]           = useState("");
  const [submitting,      setSubmitting]      = useState(false);
  const [err,             setErr]             = useState("");

  // 伴侶場次類型
  const [coupleInfo,      setCoupleInfo]      = useState<CoupleInfo | null>(null);
  const [coupleSessionType, setCoupleSessionType] = useState<"joint" | "individual_a" | "individual_b" | "">("");

  // 選擇個案後，若為伴侶諮商，取得伴侶資訊
  useEffect(() => {
    setCoupleInfo(null);
    setCoupleSessionType("");
    if (!clientId) return;
    fetch(`/api/admin/clients/${clientId}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (data?.service_type !== "couple") return;
        let partnerName: string | null = null;
        if (data.couple_partner_id) {
          const pr = await fetch(`/api/admin/clients/${data.couple_partner_id}`);
          const pd = await pr.json();
          partnerName = pd?.full_name ?? null;
        }
        setCoupleInfo({
          service_type: data.service_type,
          couple_partner_id: data.couple_partner_id ?? null,
          partner_name: partnerName,
        });
        setCoupleSessionType("joint");
      })
      .catch(() => {});
  }, [clientId]);

  function handlePlanChange(id: string) {
    setPlanId(id);
    const plan = plans.find((p) => p.id === id);
    if (plan) { setFee(plan.price_per_session.toString()); setCurrency(plan.currency); }
    else setFee("");
  }

  function handleRoomChange(id: string) {
    setRoomId(id);
    const room = rooms.find((r) => r.id === id);
    if (room?.is_online) {
      setIsOnline(true);
      if (!useCustomLink) setMeetingLink(therapistMeetLink);
    } else if (id) {
      setIsOnline(false);
      setMeetingLink("");
      setUseCustomLink(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId)    { setErr("請選擇個案");       return; }
    if (!date || !time) { setErr("請選擇日期與時間"); return; }

    setSubmitting(true);
    setErr("");

    try {
      const scheduled_at = new Date(`${date}T${time}:00+08:00`).toISOString();

      // 伴侶 joint 場次：若選 individual_b，以 partner 為主個案
      const actualClientId =
        coupleInfo && coupleSessionType === "individual_b" && coupleInfo.couple_partner_id
          ? coupleInfo.couple_partner_id
          : clientId;

      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id:                  actualClientId,
          scheduled_at,
          room_id:                    roomId  || null,
          plan_id:                    planId  || null,
          session_fee:                fee     ? parseFloat(fee) : null,
          is_online:                  isOnline,
          meeting_link:               isOnline ? (meetingLink || null) : null,
          admin_notes:                notes   || null,
          couple_session_type:        coupleSessionType || null,
          couple_partner_client_id:   coupleSessionType === "joint" && coupleInfo?.couple_partner_id
                                        ? coupleInfo.couple_partner_id
                                        : null,
        }),
      });

      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? "發生錯誤"); return; }

      router.push(`/admin/clients/${actualClientId}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep " +
    "focus:outline-none focus:border-forest/50 bg-white";

  return (
    <form onSubmit={submit} className="space-y-5 bg-white border border-sand/20 p-6">

      {/* Client selector */}
      <div>
        <label className="font-sans text-[11px] text-muted block mb-1">個案 *</label>
        {clients.length === 0 ? (
          <p className="font-sans text-xs text-muted/60 bg-sand/10 px-3 py-2">
            目前沒有已指派的個案。
          </p>
        ) : (
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            className={inputCls}
          >
            <option value="">請選擇個案…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        )}
      </div>

      {/* 伴侶場次類型（僅伴侶個案顯示） */}
      {coupleInfo && (
        <div className="space-y-2 p-3 bg-forest/5 border border-forest/15">
          <p className="font-sans text-[11px] text-forest font-medium">伴侶諮商場次類型</p>
          <div className="flex flex-wrap gap-4">
            {[
              { value: "joint",        label: "雙方同來（伴侶）" },
              { value: "individual_a", label: `個人（${clients.find(c => c.id === clientId)?.full_name ?? "A 方"}）` },
              { value: "individual_b", label: `個人（${coupleInfo.partner_name ?? "B 方"}）` },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer font-sans text-sm text-deep">
                <input
                  type="radio"
                  checked={coupleSessionType === opt.value}
                  onChange={() => setCoupleSessionType(opt.value as typeof coupleSessionType)}
                  className="w-4 h-4 border border-sand accent-forest"
                />
                {opt.label}
              </label>
            ))}
          </div>
          {coupleSessionType === "joint" && !coupleInfo.couple_partner_id && (
            <p className="font-sans text-[10px] text-amber-600">⚠ 尚未連結另一方個案，無法自動帶入雙方。請先在個案記錄中連結伴侶。</p>
          )}
        </div>
      )}

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
            return room
              ? <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: room.color }} />
              : null;
          })()}
          <select
            value={roomId}
            onChange={(e) => handleRoomChange(e.target.value)}
            className={inputCls}
          >
            <option value="">（未指定）</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* is_online */}
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={isOnline}
            onChange={(e) => {
              const on = e.target.checked;
              setIsOnline(on);
              if (on) {
                setMeetingLink(therapistMeetLink);
                setUseCustomLink(false);
              } else {
                setMeetingLink("");
                setUseCustomLink(false);
              }
            }}
            className="w-4 h-4 accent-forest"
          />
          <span className="font-sans text-sm text-deep group-hover:text-forest transition-colors">
            線上諮商輔導
          </span>
        </label>

        {isOnline && (
          <div className="pl-6 border-l-2 border-forest/20 space-y-2">
            {!useCustomLink ? (
              <div>
                <p className="font-sans text-[11px] text-muted mb-1">視訊連結（Google Meet）</p>
                {meetingLink ? (
                  <p className="font-sans text-[11px] text-forest/80 bg-sand/10 px-3 py-2 break-all leading-relaxed">
                    {meetingLink}
                  </p>
                ) : (
                  <p className="font-sans text-[11px] text-amber-600 bg-amber-50 px-3 py-2">
                    ⚠ 尚未設定 Google Meet 連結，請至「成員管理 → 基本資料」設定，或勾選下方改用其他連結。
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">視訊連結（請貼上）</label>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://..."
                  className={inputCls}
                />
                {meetingLink ? (
                  <p className="font-sans text-[10px] text-forest mt-1">
                    ✓ 個案將收到此視訊連結。
                  </p>
                ) : (
                  <p className="font-sans text-[10px] text-amber-600 mt-1">
                    如未填入連結，將交由行政手動處理。
                  </p>
                )}
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useCustomLink}
                onChange={(e) => {
                  setUseCustomLink(e.target.checked);
                  setMeetingLink(e.target.checked ? "" : therapistMeetLink);
                }}
                className="w-3 h-3 accent-amber-600"
              />
              <span className="font-sans text-[11px] text-muted/70">不使用 Google Meet，改用其他連結</span>
            </label>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="font-sans text-[11px] text-muted block mb-1">備註（行政可見）</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="特殊說明…（選填）"
          className={inputCls + " resize-none"}
        />
      </div>

      {err && <p className="font-sans text-xs text-red-500">{err}</p>}

      <div className="flex items-center gap-3 pt-2 border-t border-sand/10">
        <button
          type="submit"
          disabled={submitting || clients.length === 0}
          className="font-sans text-sm px-6 py-2 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors"
        >
          {submitting ? "建立中…" : "建立預約"}
        </button>
        <a
          href="/admin/appointments"
          className="font-sans text-xs text-muted hover:text-deep transition-colors"
        >
          取消
        </a>
      </div>
    </form>
  );
}
