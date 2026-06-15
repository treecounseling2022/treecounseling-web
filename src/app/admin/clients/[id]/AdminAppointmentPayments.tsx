"use client";

import { useState } from "react";

type Appt = {
  id: string;
  scheduled_at: string | null;
  booking_status: string;
  session_fee: number | null;
  currency: string;
  therapist_name: string | null;
};

type Payment = {
  id: string;
  appointment_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  paid_at: string | null;
};

const METHOD_LABEL: Record<string, string> = {
  cash: "現金", transfer: "轉帳", card: "刷卡", other: "其他",
};

const STATUS_LABEL: Record<string, string> = {
  pending_admin: "待排案", pending_therapist: "待確認",
  confirmed: "已確認", locked: "鎖定", cancelled: "已取消",
};

export default function AdminAppointmentPayments({
  clientId,
  initialAppts,
  initialPayments,
}: {
  clientId: string;
  initialAppts: Appt[];
  initialPayments: Payment[];
}) {
  const [paymentMap, setPaymentMap] = useState<Record<string, Payment>>(
    Object.fromEntries(initialPayments.map((p) => [p.appointment_id, p]))
  );
  const [modal, setModal] = useState<Appt | null>(null);
  const [form, setForm] = useState({ amount: "", method: "cash", notes: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function openModal(appt: Appt) {
    setForm({ amount: appt.session_fee?.toString() ?? "", method: "cash", notes: "" });
    setErr("");
    setModal(appt);
  }

  async function submitPayment() {
    if (!modal) return;
    if (!form.amount || isNaN(parseFloat(form.amount))) { setErr("請輸入金額"); return; }
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: modal.id,
          client_id: clientId,
          amount: parseFloat(form.amount),
          currency: modal.currency,
          payment_method: form.method,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "登記失敗"); return; }
      setPaymentMap((prev) => ({ ...prev, [modal.id]: data }));
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50";

  const billableAppts = initialAppts.filter(
    (a) => a.booking_status === "confirmed" || a.booking_status === "locked"
  );
  const otherAppts = initialAppts.filter(
    (a) => a.booking_status !== "confirmed" && a.booking_status !== "locked"
  );

  function renderApptRow(appt: Appt) {
    const payment = paymentMap[appt.id];
    const isBillable = appt.booking_status === "confirmed" || appt.booking_status === "locked";

    return (
      <div key={appt.id} className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="font-sans text-sm text-deep">
            {appt.scheduled_at
              ? new Date(appt.scheduled_at).toLocaleString("zh-TW", {
                  year: "numeric", month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })
              : "（時間待定）"}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="font-sans text-[11px] text-muted">
              {STATUS_LABEL[appt.booking_status] ?? appt.booking_status}
            </span>
            {appt.therapist_name && (
              <span className="font-sans text-[11px] text-muted/60">· {appt.therapist_name}</span>
            )}
            {appt.session_fee && (
              <span className="font-sans text-[11px] text-muted/60">
                · {appt.session_fee} {appt.currency}
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          {payment ? (
            <div>
              <span className="font-sans text-[11px] bg-green-50 text-green-700 px-2 py-0.5">
                已收 {payment.amount} {payment.currency}
              </span>
              <p className="font-sans text-[10px] text-muted/50 mt-0.5">
                {METHOD_LABEL[payment.payment_method] ?? payment.payment_method}
                {payment.paid_at && ` · ${new Date(payment.paid_at).toLocaleDateString("zh-TW")}`}
              </p>
              <a
                href={`/admin/receipts/${payment.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans text-[10px] text-forest hover:underline mt-0.5 inline-block"
              >
                列印收據 →
              </a>
            </div>
          ) : isBillable ? (
            <button
              onClick={() => openModal(appt)}
              className="font-sans text-[11px] bg-deep text-paper px-3 py-1 hover:bg-forest transition-colors"
            >
              登記收款
            </button>
          ) : (
            <span className="font-sans text-[11px] text-muted/30">—</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-serif text-deep text-lg">預約紀錄</h2>

      {initialAppts.length === 0 ? (
        <p className="font-sans text-xs text-muted/40 py-4">尚未有預約紀錄。</p>
      ) : (
        <div className="bg-white border border-sand/20 divide-y divide-sand/10">
          {billableAppts.map(renderApptRow)}
          {otherAppts.map(renderApptRow)}
        </div>
      )}

      {/* Payment modal */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white p-6 w-full max-w-sm space-y-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-deep text-lg">登記收款</h3>
            <p className="font-sans text-xs text-muted">
              {modal.scheduled_at
                ? new Date(modal.scheduled_at).toLocaleString("zh-TW", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })
                : "（時間待定）"}
            </p>

            <div className="space-y-3">
              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">金額（{modal.currency}）*</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className={inputCls}
                  placeholder="600"
                  min="0"
                  step="0.5"
                  autoFocus
                />
              </div>
              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">付款方式</label>
                <select
                  value={form.method}
                  onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                  className={inputCls}
                >
                  <option value="cash">現金</option>
                  <option value="transfer">轉帳</option>
                  <option value="card">刷卡</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">備註（選填）</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className={inputCls}
                  placeholder="如：分期第一期"
                />
              </div>
            </div>

            {err && <p className="font-sans text-xs text-red-500">{err}</p>}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setModal(null)}
                className="flex-1 font-sans text-xs py-2 border border-sand/30 text-muted hover:bg-sand/10 transition-colors"
              >
                取消
              </button>
              <button
                onClick={submitPayment}
                disabled={saving}
                className="flex-1 font-sans text-xs py-2 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors"
              >
                {saving ? "登記中…" : "確認收款"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
