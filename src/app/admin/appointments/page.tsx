"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────
type BookingStatus =
  | "pending_admin"
  | "pending_therapist"
  | "confirmed"
  | "rejected"
  | "locked"
  | "cancelled";

type Appointment = {
  id: string;
  booking_status: BookingStatus;
  status: string;
  client_id: string;
  therapist_id: string | null;
  room_id: string | null;
  plan_id: string | null;
  scheduled_at: string | null;
  session_fee: number | null;
  currency: string;
  is_first_session: boolean;
  client_intake_notes: string | null;
  arrangement_type: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
  created_at: string;
  clients: { id: string; full_name: string; phone: string | null } | null;
  rooms: { id: string; name: string; color: string } | null;
};

type Client = { id: string; full_name: string; phone: string | null };
type Room = { id: string; name: string; color: string; is_active: boolean };
type Therapist = { id: string; name: string };
type ServicePlan = { id: string; name: string; price_per_session: number; currency: string };

// ─── Status config ───────────────────────────────────────────
const STATUS_LABEL: Record<BookingStatus, string> = {
  pending_admin: "待排案",
  pending_therapist: "待確認",
  confirmed: "已確認",
  rejected: "已拒絕",
  locked: "已鎖定",
  cancelled: "已取消",
};
const STATUS_COLOR: Record<BookingStatus, string> = {
  pending_admin: "bg-amber-50 text-amber-700",
  pending_therapist: "bg-blue-50 text-blue-700",
  confirmed: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  locked: "bg-gray-100 text-gray-500",
  cancelled: "bg-gray-50 text-gray-400",
};

// ─── Helpers ─────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("zh-TW", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("zh-TW");
}

// ─── Main Component ───────────────────────────────────────────
export default function AppointmentsPage() {
  const [data, setData] = useState<{
    appointments: Appointment[];
    therapistMap: Record<string, string>;
  }>({ appointments: [], therapistMap: {} });

  const [clients, setClients] = useState<Client[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [tab, setTab] = useState<0 | 1 | 2>(0);

  // Modals
  const [newModal, setNewModal] = useState(false);
  const [assignModal, setAssignModal] = useState<Appointment | null>(null);
  const [rejectModal, setRejectModal] = useState<Appointment | null>(null);
  const [detailModal, setDetailModal] = useState<Appointment | null>(null);

  // New appointment form
  const [newForm, setNewForm] = useState({
    client_id: "",
    plan_id: "",
    client_intake_notes: "",
    is_first_session: false,
    admin_notes: "",
  });

  // Assign form
  const [assignForm, setAssignForm] = useState({
    therapist_id: "",
    room_id: "",
    scheduled_at: "",
    session_fee: "",
    arrangement_type: "",
  });

  const [rejectReason, setRejectReason] = useState("");
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState("");
  const [myRole, setMyRole] = useState<string | null>(null);

  // ─── Load ─────────────────────────────────────────────────
  const load = useCallback(async () => {
    const [apptRes, clientRes, roomRes, therapistRes, planRes, meRes] = await Promise.all([
      fetch("/api/admin/appointments"),
      fetch("/api/admin/clients"),
      fetch("/api/admin/rooms"),
      fetch("/api/admin/therapists"),
      fetch("/api/admin/service-plans"),
      fetch("/api/admin/me"),
    ]);
    if (apptRes.ok) setData(await apptRes.json());
    if (clientRes.ok) setClients(await clientRes.json());
    if (roomRes.ok) setRooms(await roomRes.json());
    if (therapistRes.ok) setTherapists(await therapistRes.json());
    if (planRes.ok) setPlans(await planRes.json());
    if (meRes.ok) { const me = await meRes.json(); setMyRole(me.role); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Derived lists ────────────────────────────────────────
  const isTherapist = myRole === "therapist";

  const pending = data.appointments.filter(
    (a) => a.booking_status === "pending_admin" || a.booking_status === "rejected"
  );
  const awaiting = data.appointments.filter((a) => a.booking_status === "pending_therapist");
  const settled = data.appointments.filter((a) =>
    ["confirmed", "locked", "cancelled"].includes(a.booking_status)
  );

  // Therapist view: "待確認" is a banner, tabs show confirmed + history
  const tabs = isTherapist
    ? [
        { label: `已確認 (${settled.filter((a) => a.booking_status === "confirmed").length})`, list: settled.filter((a) => a.booking_status === "confirmed") },
        { label: `其他 (${settled.filter((a) => a.booking_status !== "confirmed").length})`, list: settled.filter((a) => a.booking_status !== "confirmed") },
      ]
    : [
        { label: `待排案 (${pending.length})`, list: pending },
        { label: `待確認 (${awaiting.length})`, list: awaiting },
        { label: `已排定 (${settled.length})`, list: settled },
      ];

  // ─── Actions ─────────────────────────────────────────────
  async function action(id: string, payload: Record<string, unknown>) {
    setWorking(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? "發生錯誤"); return false; }
      await load();
      return true;
    } finally {
      setWorking(false);
    }
  }

  async function createAppointment() {
    if (!newForm.client_id) { setErr("請選擇個案"); return; }
    setWorking(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newForm,
          plan_id: newForm.plan_id || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? "發生錯誤"); return; }
      await load();
      setNewModal(false);
      setNewForm({ client_id: "", plan_id: "", client_intake_notes: "", is_first_session: false, admin_notes: "" });
    } finally {
      setWorking(false);
    }
  }

  async function doAssign() {
    if (!assignModal || !assignForm.therapist_id) { setErr("請選擇心理師"); return; }
    const ok = await action(assignModal.id, {
      action: "assign",
      therapist_id: assignForm.therapist_id,
      room_id: assignForm.room_id || null,
      scheduled_at: assignForm.scheduled_at || null,
      session_fee: assignForm.session_fee ? +assignForm.session_fee : null,
      arrangement_type: assignForm.arrangement_type || null,
    });
    if (ok) { setAssignModal(null); setAssignForm({ therapist_id: "", room_id: "", scheduled_at: "", session_fee: "", arrangement_type: "" }); }
  }

  async function doReject() {
    if (!rejectModal) return;
    const ok = await action(rejectModal.id, { action: "reject", rejection_reason: rejectReason });
    if (ok) { setRejectModal(null); setRejectReason(""); }
  }

  const inputCls = "w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50";

  // ─── Appointment Card ─────────────────────────────────────
  function Card({ appt }: { appt: Appointment }) {
    const therapistName = appt.therapist_id ? data.therapistMap[appt.therapist_id] ?? "—" : null;

    return (
      <div className="bg-white border border-sand/20 p-4 space-y-3 hover:border-sand/40 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-serif text-deep">{appt.clients?.full_name ?? "（未知個案）"}</p>
            {appt.clients?.phone && (
              <p className="font-sans text-[11px] text-muted/60">{appt.clients.phone}</p>
            )}
          </div>
          <span className={`font-sans text-[10px] px-2 py-0.5 flex-shrink-0 ${STATUS_COLOR[appt.booking_status]}`}>
            {STATUS_LABEL[appt.booking_status]}
          </span>
        </div>

        {appt.client_intake_notes && (
          <p className="font-sans text-xs text-muted leading-relaxed line-clamp-2 bg-sand/10 px-3 py-2">
            {appt.client_intake_notes}
          </p>
        )}

        {appt.rejection_reason && (
          <p className="font-sans text-xs text-red-500 bg-red-50 px-3 py-2">
            拒絕原因：{appt.rejection_reason}
          </p>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-sans text-muted">
          {therapistName && <span>心理師：{therapistName}</span>}
          {appt.rooms && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: appt.rooms.color }} />
              {appt.rooms.name}
            </span>
          )}
          {appt.scheduled_at && <span className="col-span-2">時間：{fmtDate(appt.scheduled_at)}</span>}
          {appt.session_fee && (
            <span>費用：{appt.session_fee} {appt.currency}</span>
          )}
          <span className="text-muted/40">申請於 {fmtDay(appt.created_at)}</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1 flex-wrap">
          {!isTherapist && (appt.booking_status === "pending_admin" || appt.booking_status === "rejected") ? (
            <button
              onClick={() => {
                setAssignForm({
                  therapist_id: appt.therapist_id ?? "",
                  room_id: appt.room_id ?? "",
                  scheduled_at: appt.scheduled_at ? new Date(appt.scheduled_at).toISOString().slice(0,16) : "",
                  session_fee: appt.session_fee?.toString() ?? "",
                  arrangement_type: appt.arrangement_type ?? "",
                });
                setErr("");
                setAssignModal(appt);
              }}
              className="font-sans text-[11px] px-3 py-1.5 bg-deep text-paper hover:bg-forest transition-colors"
            >
              排案 →
            </button>
          ) : null}

          {appt.booking_status === "pending_therapist" ? (
            <>
              <button
                onClick={() => action(appt.id, { action: "confirm" })}
                disabled={working}
                className="font-sans text-[11px] px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
              >
                確認接案
              </button>
              <button
                onClick={() => { setErr(""); setRejectModal(appt); setRejectReason(""); }}
                className="font-sans text-[11px] px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                拒絕
              </button>
            </>
          ) : null}

          {!isTherapist && appt.booking_status === "confirmed" ? (
            <button
              onClick={() => action(appt.id, { action: "lock" })}
              disabled={working}
              className="font-sans text-[11px] px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            >
              鎖定
            </button>
          ) : null}

          {!isTherapist && ["pending_admin", "pending_therapist", "confirmed"].includes(appt.booking_status) && (
            <button
              onClick={() => { if (confirm("確定取消此預約？")) action(appt.id, { action: "cancel" }); }}
              disabled={working}
              className="font-sans text-[11px] px-3 py-1.5 text-red-400 hover:bg-red-50 disabled:opacity-40 transition-colors"
            >
              取消
            </button>
          )}

          <button
            onClick={() => setDetailModal(appt)}
            className="font-sans text-[11px] px-3 py-1.5 text-muted/60 hover:text-muted transition-colors ml-auto"
          >
            詳情
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-sans text-xs text-muted mb-1">
            <a href="/admin" className="hover:text-forest">後台</a> / {isTherapist ? "我的預約" : "預約派案"}
          </p>
          <h1 className="font-serif text-deep text-2xl">
            {isTherapist ? "我的預約" : "預約派案"}
          </h1>
          <p className="font-sans text-xs text-muted mt-0.5">
            {isTherapist ? "查看及確認派給你的預約。" : "管理個案預約申請，排案給心理師。"}
          </p>
        </div>
        {!isTherapist && (
          <button
            onClick={() => { setErr(""); setNewModal(true); }}
            className="font-sans text-xs bg-deep text-paper px-4 py-2 hover:bg-forest transition-colors flex-shrink-0"
          >
            + 新增預約
          </button>
        )}
      </div>

      {/* Therapist: highlight pending confirmations at top */}
      {isTherapist && awaiting.length > 0 && (
        <div className="border-2 border-amber-400 bg-amber-50 p-4 space-y-3">
          <p className="font-sans text-xs font-medium text-amber-700">
            ⚠ 有 {awaiting.length} 個預約等待你確認
          </p>
          <div className="space-y-3">
            {awaiting.map((appt) => (
              <Card key={appt.id} appt={appt} />
            ))}
          </div>
        </div>
      )}
      {isTherapist && awaiting.length === 0 && (
        <div className="border border-sand/20 bg-white px-4 py-3 font-sans text-xs text-muted/50">
          目前沒有待確認的預約。
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-sand/20">
        <div className="flex gap-0">
          {tabs.map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i as 0 | 1 | 2)}
              className={`font-sans text-xs px-5 py-2.5 transition-colors border-b-2 -mb-px ${
                tab === i
                  ? "border-deep text-deep font-medium"
                  : "border-transparent text-muted hover:text-deep"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tabs[tab].list.map((appt) => (
          <Card key={appt.id} appt={appt} />
        ))}
        {tabs[tab].list.length === 0 && (
          <div className="col-span-2 text-center py-16 font-sans text-xs text-muted/40">
            此分類目前沒有預約。
          </div>
        )}
      </div>

      {/* ── New Appointment Modal ── */}
      {newModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={() => setNewModal(false)}>
          <div className="bg-white p-6 w-full max-w-md space-y-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif text-deep text-lg">新增預約申請</h2>

            <div className="space-y-3">
              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">個案 *</label>
                <select
                  value={newForm.client_id}
                  onChange={(e) => setNewForm((f) => ({ ...f, client_id: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">請選擇個案…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` · ${c.phone}` : ""}</option>)}
                </select>
              </div>

              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">服務方案</label>
                <select
                  value={newForm.plan_id}
                  onChange={(e) => setNewForm((f) => ({ ...f, plan_id: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">（未指定）</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {p.price_per_session} {p.currency}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">個案說明 / 求助原因</label>
                <textarea
                  value={newForm.client_intake_notes}
                  onChange={(e) => setNewForm((f) => ({ ...f, client_intake_notes: e.target.value }))}
                  rows={3}
                  className={inputCls + " resize-none"}
                  placeholder="個案填寫的背景說明…"
                />
              </div>

              <label className="flex items-center gap-2 font-sans text-sm text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={newForm.is_first_session}
                  onChange={(e) => setNewForm((f) => ({ ...f, is_first_session: e.target.checked }))}
                  className="accent-forest"
                />
                首次晤談
              </label>

              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">行政備註</label>
                <input
                  value={newForm.admin_notes}
                  onChange={(e) => setNewForm((f) => ({ ...f, admin_notes: e.target.value }))}
                  className={inputCls}
                  placeholder="內部備註…"
                />
              </div>
            </div>

            {err && <p className="font-sans text-xs text-red-500">{err}</p>}

            <div className="flex gap-2 pt-2">
              <button onClick={() => setNewModal(false)} className="flex-1 font-sans text-xs py-2 border border-sand/30 text-muted hover:bg-sand/10 transition-colors">取消</button>
              <button onClick={createAppointment} disabled={working} className="flex-1 font-sans text-xs py-2 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors">
                {working ? "建立中…" : "建立預約"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Modal ── */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={() => setAssignModal(null)}>
          <div className="bg-white p-6 w-full max-w-md space-y-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif text-deep text-lg">排案 — {assignModal.clients?.full_name}</h2>

            <div className="space-y-3">
              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">心理師 *</label>
                <select value={assignForm.therapist_id} onChange={(e) => setAssignForm((f) => ({ ...f, therapist_id: e.target.value }))} className={inputCls}>
                  <option value="">請選擇…</option>
                  {therapists.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">諮商室</label>
                <select value={assignForm.room_id} onChange={(e) => setAssignForm((f) => ({ ...f, room_id: e.target.value }))} className={inputCls}>
                  <option value="">（未指定）</option>
                  {rooms.filter((r) => r.is_active).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">預定時間</label>
                <input type="datetime-local" value={assignForm.scheduled_at} onChange={(e) => setAssignForm((f) => ({ ...f, scheduled_at: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">收費（MOP）</label>
                <input type="number" value={assignForm.session_fee} onChange={(e) => setAssignForm((f) => ({ ...f, session_fee: e.target.value }))} className={inputCls} placeholder="600" />
              </div>
              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">排案說明</label>
                <input value={assignForm.arrangement_type} onChange={(e) => setAssignForm((f) => ({ ...f, arrangement_type: e.target.value }))} className={inputCls} placeholder="例：個案偏好女性心理師" />
              </div>
            </div>

            {err && <p className="font-sans text-xs text-red-500">{err}</p>}

            <div className="flex gap-2 pt-2">
              <button onClick={() => setAssignModal(null)} className="flex-1 font-sans text-xs py-2 border border-sand/30 text-muted hover:bg-sand/10 transition-colors">取消</button>
              <button onClick={doAssign} disabled={working} className="flex-1 font-sans text-xs py-2 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors">
                {working ? "派案中…" : "確認派案"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-white p-6 w-full max-w-sm space-y-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif text-deep text-lg">拒絕派案</h2>
            <p className="font-sans text-xs text-muted">拒絕後，此預約將退回「待排案」佇列。</p>
            <div>
              <label className="font-sans text-[11px] text-muted block mb-1">拒絕原因</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className={inputCls + " resize-none"}
                placeholder="請說明拒絕原因…"
                autoFocus
              />
            </div>
            {err && <p className="font-sans text-xs text-red-500">{err}</p>}
            <div className="flex gap-2">
              <button onClick={() => setRejectModal(null)} className="flex-1 font-sans text-xs py-2 border border-sand/30 text-muted hover:bg-sand/10 transition-colors">取消</button>
              <button onClick={doReject} disabled={working} className="flex-1 font-sans text-xs py-2 bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 transition-colors">
                {working ? "處理中…" : "確認拒絕"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={() => setDetailModal(null)}>
          <div className="bg-white p-6 w-full max-w-md space-y-3 shadow-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-deep text-lg">{detailModal.clients?.full_name}</h2>
              <span className={`font-sans text-[10px] px-2 py-0.5 ${STATUS_COLOR[detailModal.booking_status]}`}>
                {STATUS_LABEL[detailModal.booking_status]}
              </span>
            </div>
            <div className="space-y-1 font-sans text-xs text-muted">
              {detailModal.clients?.phone && <p>電話：{detailModal.clients.phone}</p>}
              {detailModal.therapist_id && <p>心理師：{data.therapistMap[detailModal.therapist_id] ?? "—"}</p>}
              {detailModal.rooms && <p>諮商室：{detailModal.rooms.name}</p>}
              {detailModal.scheduled_at && <p>時間：{fmtDate(detailModal.scheduled_at)}</p>}
              {detailModal.session_fee && <p>費用：{detailModal.session_fee} {detailModal.currency}</p>}
              {detailModal.is_first_session && <p className="text-forest">首次晤談</p>}
            </div>
            {detailModal.client_intake_notes && (
              <div>
                <p className="font-sans text-[11px] text-muted mb-1">個案說明</p>
                <p className="font-sans text-xs text-deep bg-sand/10 px-3 py-2 leading-relaxed">{detailModal.client_intake_notes}</p>
              </div>
            )}
            {detailModal.arrangement_type && (
              <div>
                <p className="font-sans text-[11px] text-muted mb-1">排案說明</p>
                <p className="font-sans text-xs text-deep">{detailModal.arrangement_type}</p>
              </div>
            )}
            {detailModal.rejection_reason && (
              <div>
                <p className="font-sans text-[11px] text-red-500 mb-1">拒絕原因</p>
                <p className="font-sans text-xs text-red-600 bg-red-50 px-3 py-2">{detailModal.rejection_reason}</p>
              </div>
            )}
            {detailModal.admin_notes && (
              <div>
                <p className="font-sans text-[11px] text-muted mb-1">行政備註</p>
                <p className="font-sans text-xs text-muted">{detailModal.admin_notes}</p>
              </div>
            )}
            <button onClick={() => setDetailModal(null)} className="w-full font-sans text-xs py-2 border border-sand/30 text-muted hover:bg-sand/10 transition-colors mt-2">
              關閉
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
