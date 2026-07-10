"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { todayInMacau } from "@/lib/utils";

type Room = { id: string; name: string; color: string; is_online?: boolean };

type Props = {
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  rooms: Room[];
};

export function TherapistBookingModal({ clientId, clientName, clientEmail, rooms }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const today = todayInMacau();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [roomId, setRoomId] = useState("");
  const [fee, setFee] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(clientEmail ?? "");
  const [extraEmail, setExtraEmail] = useState("");
  const [noteToClient, setNoteToClient] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);

  function reset() {
    setDate("");
    setTime("10:00");
    setRoomId("");
    setFee("");
    setNotifyEmail(clientEmail ?? "");
    setExtraEmail("");
    setNoteToClient("");
    setErr("");
    setSuccess(false);
  }

  function close() {
    setOpen(false);
    reset();
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
          session_fee: fee ? parseFloat(fee) : null,
          notify_email: notifyEmail || null,
          notify_email_extra: extraEmail || null,
          note_to_client: noteToClient || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? "發生錯誤"); return; }

      setSuccess(true);
      router.refresh();
      setTimeout(() => close(), 2000);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50 bg-white";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="font-sans text-xs bg-deep text-paper px-4 py-2 hover:bg-forest transition-colors"
      >
        + 新增預約
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-sand/20">
              <h2 className="font-serif text-deep text-lg">新增預約</h2>
              <button
                onClick={close}
                className="text-muted/60 hover:text-deep transition-colors text-lg leading-none"
                aria-label="關閉"
              >
                ✕
              </button>
            </div>

            {success ? (
              <div className="px-5 py-8 text-center">
                <p className="font-sans text-sm text-forest">✓ 預約已建立，確認信已發送</p>
              </div>
            ) : (
              <form onSubmit={submit} className="px-5 py-5 space-y-4">
                <p className="font-sans text-xs text-muted">個案：<strong className="text-deep">{clientName}</strong></p>

                {/* Date + Time */}
                <div className="grid grid-cols-2 gap-3">
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

                {/* Room */}
                <div>
                  <label className="font-sans text-[11px] text-muted block mb-1">空間</label>
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
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

                {/* Fee */}
                <div>
                  <label className="font-sans text-[11px] text-muted block mb-1">費用（MOP）</label>
                  <input
                    type="number"
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    placeholder="600"
                    min="0"
                    className={inputCls}
                  />
                </div>

                {/* Divider */}
                <div className="border-t border-sand/20 pt-4">
                  <p className="font-sans text-[11px] text-muted/70 mb-3">通知設定（填寫後系統自動寄出確認信）</p>

                  <div className="space-y-3">
                    <div>
                      <label className="font-sans text-[11px] text-muted block mb-1">個案 / 主要聯絡信箱</label>
                      <input
                        type="email"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder="client@example.com"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="font-sans text-[11px] text-muted block mb-1">另行通知（伴侶 / 監護人）</label>
                      <input
                        type="email"
                        value={extraEmail}
                        onChange={(e) => setExtraEmail(e.target.value)}
                        placeholder="partner@example.com（選填）"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="font-sans text-[11px] text-muted block mb-1">附加說明（顯示於信件中）</label>
                      <textarea
                        value={noteToClient}
                        onChange={(e) => setNoteToClient(e.target.value)}
                        rows={2}
                        placeholder="例：請攜帶上次的作業資料。（選填）"
                        className={inputCls + " resize-none"}
                      />
                    </div>
                  </div>
                </div>

                {err && <p className="font-sans text-xs text-red-500">{err}</p>}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="font-sans text-sm px-5 py-2 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors"
                  >
                    {submitting ? "建立中…" : "建立預約並寄信"}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="font-sans text-xs text-muted hover:text-deep transition-colors"
                  >
                    取消
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
