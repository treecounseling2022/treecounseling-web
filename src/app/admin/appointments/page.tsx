"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { todayInMacau } from "@/lib/utils";

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
  is_online: boolean;
  meeting_link: string | null;
  client_intake_notes: string | null;
  arrangement_type: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
  created_at: string;
  couple_session_type: string | null;
  clients: { id: string; full_name: string; phone: string | null } | null;
  couple_partner: { id: string; full_name: string } | null;
  rooms: { id: string; name: string; color: string } | null;
};

// 伴侶 joint 場次顯示兩人姓名，其餘只顯示個案本人
function clientLabel(appt: Appointment): string {
  if (appt.couple_session_type === "joint" && appt.couple_partner) {
    return `${appt.clients?.full_name ?? "（未知個案）"} ＆ ${appt.couple_partner.full_name}`;
  }
  return appt.clients?.full_name ?? "（未知個案）";
}

type Client = { id: string; full_name: string; phone: string | null; assigned_therapist_id: string | null; service_type: string | null; couple_partner_id: string | null };
type Room = { id: string; name: string; color: string; is_active: boolean };
type Therapist = { id: string; name: string; google_meet_link: string | null };
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
  pending_admin:    "adm-badge-warning",
  pending_therapist:"adm-badge-info",
  confirmed:        "adm-badge-success",
  rejected:         "adm-badge-danger",
  locked:           "adm-badge-neutral",
  cancelled:        "adm-badge-faded",
};

// ─── Helpers ─────────────────────────────────────────────────
const TZ = "Asia/Macau";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("zh-TW", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("zh-TW", { timeZone: TZ });
}

// UTC ISO → "YYYY-MM-DDTHH:mm" in Macau local time (for datetime-local inputs)
function toMacauInput(iso: string): string {
  return new Date(iso).toLocaleString("sv", { timeZone: TZ }).replace(" ", "T").slice(0, 16);
}

// ─── Main Component ───────────────────────────────────────────
export default function AppointmentsPage() {
  const router = useRouter();
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
  const [rescheduleModal, setRescheduleModal] = useState<Appointment | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({ scheduled_date: "", scheduled_time: "", room_id: "" });
  const [editModal, setEditModal] = useState<Appointment | null>(null);
  const [editForm, setEditForm] = useState({ is_online: false, meeting_link: "", room_id: "", session_fee: "", admin_notes: "", arrangement_type: "" });

  // New appointment form
  const [newForm, setNewForm] = useState({
    client_id: "",
    therapist_id: "",
    room_id: "",
    scheduled_date: todayInMacau(),
    scheduled_time: "",
    plan_id: "",
    session_fee: "",
    is_first_session: false,
    is_online: false,
    meeting_link: "",
    use_custom_link: false,
    client_intake_notes: "",
    admin_notes: "",
    direct_entry: false,
  });
  const resetNewForm = () => setNewForm({
    client_id: "", therapist_id: "", room_id: "",
    scheduled_date: todayInMacau(), scheduled_time: "",
    plan_id: "", session_fee: "", is_first_session: false,
    is_online: false, meeting_link: "", use_custom_link: false,
    client_intake_notes: "", admin_notes: "", direct_entry: false,
  });

  // Assign form
  const [assignForm, setAssignForm] = useState({
    therapist_id: "",
    room_id: "",
    is_online: false,
    meeting_link: "",
    use_custom_link: false,
    scheduled_date: todayInMacau(),
    scheduled_time: "",
    session_fee: "",
    arrangement_type: "",
  });

  const getTherapistMeetLink = (therapistId: string) =>
    therapists.find((t) => t.id === therapistId)?.google_meet_link ?? "";

  const [rejectReason, setRejectReason] = useState("");
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState("");
  const [myRole, setMyRole] = useState<string | null>(null);

  // 伴侶場次（新增預約 modal 用）
  type NewCoupleInfo = { couple_partner_id: string | null; partner_name: string | null };
  const [newCoupleInfo, setNewCoupleInfo] = useState<NewCoupleInfo | null>(null);
  const [newCoupleSessionType, setNewCoupleSessionType] = useState<"joint" | "individual_a" | "individual_b" | "">("");

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

  // 選個案後偵測是否為伴侶諮商，若是則取得對方姓名
  useEffect(() => {
    setNewCoupleInfo(null);
    setNewCoupleSessionType("");
    if (!newForm.client_id) return;
    const found = clients.find((c) => c.id === newForm.client_id);
    if (found?.service_type !== "couple") return;
    setNewCoupleSessionType("joint");
    if (!found.couple_partner_id) {
      setNewCoupleInfo({ couple_partner_id: null, partner_name: null });
      return;
    }
    fetch(`/api/admin/clients/${found.couple_partner_id}`)
      .then((r) => r.json())
      .then((pd) => setNewCoupleInfo({ couple_partner_id: found.couple_partner_id!, partner_name: pd?.full_name ?? null }))
      .catch(() => setNewCoupleInfo({ couple_partner_id: found.couple_partner_id!, partner_name: null }));
  }, [newForm.client_id, clients]);

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
      router.refresh();
      return true;
    } finally {
      setWorking(false);
    }
  }

  async function createAppointment() {
    if (!newForm.client_id) { setErr("請選擇個案"); return; }
    if (newForm.direct_entry && !newForm.therapist_id) { setErr("補錄模式需指定心理師"); return; }
    if (newForm.direct_entry && (!newForm.scheduled_date || !newForm.scheduled_time)) { setErr("補錄模式需填寫晤談日期與時間"); return; }
    if (!newForm.direct_entry && newForm.therapist_id && !newForm.scheduled_time) { setErr("已指派心理師，請選擇預約時間"); return; }
    setWorking(true);
    setErr("");
    try {
      const scheduled_at = newForm.scheduled_date && newForm.scheduled_time
        ? new Date(`${newForm.scheduled_date}T${newForm.scheduled_time}:00+08:00`).toISOString()
        : null;

      // 伴侶 individual_b：以另一方個案為主個案
      const actualClientId =
        newCoupleInfo && newCoupleSessionType === "individual_b" && newCoupleInfo.couple_partner_id
          ? newCoupleInfo.couple_partner_id
          : newForm.client_id;

      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: actualClientId,
          therapist_id: newForm.therapist_id || null,
          room_id: newForm.room_id || null,
          scheduled_at,
          plan_id: newForm.plan_id || null,
          session_fee: newForm.session_fee ? parseFloat(newForm.session_fee) : null,
          is_first_session: newForm.is_first_session,
          is_online: newForm.is_online,
          meeting_link: newForm.is_online ? (newForm.meeting_link || null) : null,
          client_intake_notes: newForm.client_intake_notes || null,
          admin_notes: newForm.admin_notes || null,
          couple_session_type: newCoupleSessionType || null,
          couple_partner_client_id:
            newCoupleSessionType === "joint" && newCoupleInfo?.couple_partner_id
              ? newCoupleInfo.couple_partner_id
              : null,
          ...(newForm.direct_entry ? { booking_status: "locked" } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? "發生錯誤"); return; }
      await load();
      setNewModal(false);
      resetNewForm();
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
      is_online: assignForm.is_online,
      meeting_link: assignForm.is_online ? (assignForm.meeting_link || null) : null,
      scheduled_at: (assignForm.scheduled_date && assignForm.scheduled_time)
        ? `${assignForm.scheduled_date}T${assignForm.scheduled_time}:00+08:00`
        : null,
      session_fee: assignForm.session_fee ? +assignForm.session_fee : null,
      arrangement_type: assignForm.arrangement_type || null,
    });
    if (ok) {
      setAssignModal(null);
      setAssignForm({ therapist_id: "", room_id: "", is_online: false, meeting_link: "", use_custom_link: false, scheduled_date: todayInMacau(), scheduled_time: "", session_fee: "", arrangement_type: "" });
    }
  }

  async function doReject() {
    if (!rejectModal) return;
    const ok = await action(rejectModal.id, { action: "reject", rejection_reason: rejectReason });
    if (ok) { setRejectModal(null); setRejectReason(""); }
  }

  async function doReschedule() {
    if (!rescheduleModal || !rescheduleForm.scheduled_date) { setErr("請選擇新的預約時間"); return; }
    const ok = await action(rescheduleModal.id, {
      action: "reschedule",
      scheduled_at: `${rescheduleForm.scheduled_date}T${rescheduleForm.scheduled_time || "00:00"}:00+08:00`,
      room_id: rescheduleForm.room_id || null,
    });
    if (ok) { setRescheduleModal(null); setRescheduleForm({ scheduled_date: "", scheduled_time: "", room_id: "" }); }
  }

  function openEditModal(appt: Appointment) {
    setEditModal(appt);
    setEditForm({
      is_online: appt.is_online ?? false,
      meeting_link: appt.meeting_link ?? "",
      room_id: appt.room_id ?? "",
      session_fee: appt.session_fee?.toString() ?? "",
      admin_notes: appt.admin_notes ?? "",
      arrangement_type: appt.arrangement_type ?? "",
    });
    setErr("");
  }

  async function doEdit() {
    if (!editModal) return;
    const ok = await action(editModal.id, {
      action: "edit",
      is_online: editForm.is_online,
      meeting_link: editForm.is_online ? (editForm.meeting_link || null) : null,
      room_id: editForm.room_id || null,
      session_fee: editForm.session_fee ? parseFloat(editForm.session_fee) : null,
      admin_notes: editForm.admin_notes || null,
      arrangement_type: editForm.arrangement_type || null,
    });
    if (ok) { setEditModal(null); setDetailModal(null); }
  }

  const inputCls = "w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50";

  // ─── Appointment Card ─────────────────────────────────────
  function Card({ appt }: { appt: Appointment }) {
    const therapistName = appt.therapist_id ? data.therapistMap[appt.therapist_id] ?? "—" : null;

    return (
      <div className="bg-white border border-sand/20 p-4 space-y-3 hover:border-sand/40 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-serif text-deep">{clientLabel(appt)}</p>
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
                const _existingIso = appt.scheduled_at ? toMacauInput(appt.scheduled_at) : null;
                setAssignForm({
                  therapist_id: appt.therapist_id ?? "",
                  room_id: appt.room_id ?? "",
                  is_online: false,
                  meeting_link: "",
                  use_custom_link: false,
                  scheduled_date: _existingIso ? _existingIso.slice(0, 10) : "",
                  scheduled_time: _existingIso ? _existingIso.slice(11, 16) : "",
                  session_fee: "",
                  arrangement_type: "",
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
            <>
              <button
                onClick={() => action(appt.id, { action: "lock" })}
                disabled={working}
                className="font-sans text-[11px] px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition-colors"
              >
                鎖定
              </button>
              <button
                onClick={() => {
                  const _rIso = appt.scheduled_at ? toMacauInput(appt.scheduled_at) : null;
                  setRescheduleForm({
                    scheduled_date: _rIso ? _rIso.slice(0, 10) : "",
                    scheduled_time: _rIso ? _rIso.slice(11, 16) : "",
                    room_id: appt.room_id ?? "",
                  });
                  setErr("");
                  setRescheduleModal(appt);
                }}
                className="font-sans text-[11px] px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                修改時間
              </button>
            </>
          ) : null}

          {!isTherapist && appt.booking_status === "locked" ? (
            <button
              onClick={() => {
                const _rIso2 = appt.scheduled_at ? toMacauInput(appt.scheduled_at) : null;
                setRescheduleForm({
                  scheduled_date: _rIso2 ? _rIso2.slice(0, 10) : "",
                  scheduled_time: _rIso2 ? _rIso2.slice(11, 16) : "",
                  room_id: appt.room_id ?? "",
                });
                setErr("");
                setRescheduleModal(appt);
              }}
              className="font-sans text-[11px] px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
            >
              修改時間
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
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={() => { setNewModal(false); setErr(""); resetNewForm(); }}>
          <div className="bg-white w-full max-w-md shadow-sm overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <h2 className="font-serif text-deep text-lg">新增預約</h2>

              <div className="space-y-3">
                <div>
                  <label className="font-sans text-[11px] text-muted block mb-1">個案 *</label>
                  <select
                    value={newForm.client_id}
                    onChange={(e) => {
                      const cid = e.target.value;
                      const found = clients.find((c) => c.id === cid);
                      const assignedTherapist = found?.assigned_therapist_id ?? "";
                      setNewForm((f) => ({
                        ...f,
                        client_id: cid,
                        therapist_id: assignedTherapist,
                        ...(f.is_online && !f.use_custom_link && assignedTherapist
                          ? { meeting_link: getTherapistMeetLink(assignedTherapist) }
                          : {}),
                      }));
                    }}
                    className={inputCls}
                  >
                    <option value="">請選擇個案…</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` · ${c.phone}` : ""}</option>)}
                  </select>
                </div>

                {/* 伴侶場次類型（選到伴侶個案才顯示） */}
                {newCoupleInfo && (
                  <div className="space-y-2 p-3 bg-forest/5 border border-forest/15">
                    <p className="font-sans text-[11px] text-forest font-medium">伴侶諮商場次類型</p>
                    <div className="flex flex-wrap gap-4">
                      {[
                        { value: "joint",        label: "雙方同來（伴侶）" },
                        { value: "individual_a", label: `個人（${clients.find((c) => c.id === newForm.client_id)?.full_name ?? "A 方"}）` },
                        { value: "individual_b", label: `個人（${newCoupleInfo.partner_name ?? "B 方"}）` },
                      ].map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer font-sans text-sm text-deep">
                          <input
                            type="radio"
                            checked={newCoupleSessionType === opt.value}
                            onChange={() => setNewCoupleSessionType(opt.value as typeof newCoupleSessionType)}
                            className="w-4 h-4 border border-sand accent-forest"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                    {newCoupleSessionType === "joint" && !newCoupleInfo.couple_partner_id && (
                      <p className="font-sans text-[10px] text-amber-600">⚠ 尚未連結另一方個案，無法自動帶入雙方。請先在個案記錄中連結伴侶。</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="font-sans text-[11px] text-muted block mb-1">心理師</label>
                  <select
                    value={newForm.therapist_id}
                    onChange={(e) => setNewForm((f) => ({
                      ...f,
                      therapist_id: e.target.value,
                      ...(f.is_online && !f.use_custom_link ? { meeting_link: getTherapistMeetLink(e.target.value) } : {}),
                    }))}
                    className={inputCls}
                  >
                    <option value="">（尚未指派）</option>
                    {therapists.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-sans text-[11px] text-muted block mb-1">日期</label>
                    <input type="date" value={newForm.scheduled_date} onChange={(e) => setNewForm((f) => ({ ...f, scheduled_date: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="font-sans text-[11px] text-muted block mb-1">時間</label>
                    <input type="time" value={newForm.scheduled_time} onChange={(e) => setNewForm((f) => ({ ...f, scheduled_time: e.target.value }))} className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className="font-sans text-[11px] text-muted block mb-1">諮商室</label>
                  <select value={newForm.room_id} onChange={(e) => setNewForm((f) => ({ ...f, room_id: e.target.value }))} className={inputCls}>
                    <option value="">（未指定）</option>
                    {rooms.filter((r) => r.is_active).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="font-sans text-[11px] text-muted block mb-1">服務方案</label>
                  <select value={newForm.plan_id} onChange={(e) => setNewForm((f) => ({ ...f, plan_id: e.target.value }))} className={inputCls}>
                    <option value="">（未指定）</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.price_per_session} {p.currency}</option>)}
                  </select>
                </div>

                <div>
                  <label className="font-sans text-[11px] text-muted block mb-1">費用</label>
                  <input type="number" value={newForm.session_fee} onChange={(e) => setNewForm((f) => ({ ...f, session_fee: e.target.value }))} placeholder="0" min="0" step="0.5" className={inputCls} />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newForm.is_online}
                      onChange={(e) => setNewForm((f) => ({
                        ...f,
                        is_online: e.target.checked,
                        room_id: e.target.checked ? "" : f.room_id,
                        meeting_link: e.target.checked ? getTherapistMeetLink(f.therapist_id) : "",
                        use_custom_link: false,
                      }))}
                      className="accent-forest w-4 h-4"
                    />
                    <span className="font-sans text-sm text-deep">線上諮商</span>
                  </label>

                  {newForm.is_online && (
                    <div className="pl-6 border-l-2 border-forest/20 space-y-2">
                      {!newForm.use_custom_link ? (
                        <div>
                          <p className="font-sans text-[11px] text-muted mb-1">視訊連結（Google Meet）</p>
                          {newForm.meeting_link ? (
                            <p className="font-sans text-[11px] text-forest/80 bg-sand/10 px-3 py-2 break-all">{newForm.meeting_link}</p>
                          ) : (
                            <p className="font-sans text-[11px] text-amber-600 bg-amber-50 px-3 py-2">⚠ 請先指派心理師，或勾選下方改用其他連結。</p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <label className="font-sans text-[11px] text-muted block mb-1">視訊連結（請貼上）</label>
                          <input value={newForm.meeting_link} onChange={(e) => setNewForm((f) => ({ ...f, meeting_link: e.target.value }))} placeholder="https://..." className={inputCls} />
                        </div>
                      )}
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newForm.use_custom_link}
                          onChange={(e) => setNewForm((f) => ({
                            ...f,
                            use_custom_link: e.target.checked,
                            meeting_link: e.target.checked ? "" : getTherapistMeetLink(f.therapist_id),
                          }))}
                          className="w-3 h-3 accent-amber-600"
                        />
                        <span className="font-sans text-[11px] text-muted/70">不使用 Google Meet，改用其他連結</span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="border-t border-sand/10 pt-3 space-y-3">
                  <label className="flex items-center gap-2 font-sans text-sm text-muted cursor-pointer">
                    <input type="checkbox" checked={newForm.is_first_session} onChange={(e) => setNewForm((f) => ({ ...f, is_first_session: e.target.checked }))} className="accent-forest" />
                    首次晤談
                  </label>
                  <div>
                    <label className="font-sans text-[11px] text-muted block mb-1">個案說明 / 求助原因</label>
                    <textarea value={newForm.client_intake_notes} onChange={(e) => setNewForm((f) => ({ ...f, client_intake_notes: e.target.value }))} rows={2} className={inputCls + " resize-none"} placeholder="個案背景說明…" />
                  </div>
                  <div>
                    <label className="font-sans text-[11px] text-muted block mb-1">行政備註</label>
                    <input value={newForm.admin_notes} onChange={(e) => setNewForm((f) => ({ ...f, admin_notes: e.target.value }))} className={inputCls} placeholder="內部備註…" />
                  </div>
                </div>
              </div>

              {/* 補錄模式 */}
              <div className={`p-3 border ${newForm.direct_entry ? "border-amber-300 bg-amber-50" : "border-sand/20 bg-sand/5"}`}>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newForm.direct_entry}
                    onChange={(e) => setNewForm((f) => ({ ...f, direct_entry: e.target.checked }))}
                    className="accent-amber-600 w-4 h-4"
                  />
                  <span className="font-sans text-sm text-deep font-medium">補錄模式（直接建立已鎖定晤談）</span>
                </label>
                {newForm.direct_entry && (
                  <p className="font-sans text-[11px] text-amber-700 mt-1.5 leading-relaxed">
                    適用於遷入紙本個案過往記錄。晤談將直接設為「已鎖定」狀態，心理師和時間為必填。
                  </p>
                )}
              </div>

              {err && <p className="font-sans text-xs text-red-500">{err}</p>}

              <div className="flex gap-2 pt-2">
                <button onClick={() => { setNewModal(false); setErr(""); resetNewForm(); }} className="flex-1 font-sans text-xs py-2 border border-sand/30 text-muted hover:bg-sand/10 transition-colors">取消</button>
                <button onClick={createAppointment} disabled={working} className={`flex-1 font-sans text-xs py-2 disabled:opacity-40 transition-colors ${newForm.direct_entry ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-deep text-paper hover:bg-forest"}`}>
                  {working ? "建立中…" : newForm.direct_entry ? "補錄晤談" : "建立預約"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Modal ── */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={() => setAssignModal(null)}>
          <div className="bg-white p-6 w-full max-w-md space-y-4 shadow-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif text-deep text-lg">排案 — {clientLabel(assignModal)}</h2>

            <div className="space-y-3">
              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">心理師 *</label>
                <select
                  value={assignForm.therapist_id}
                  onChange={(e) => setAssignForm((f) => ({
                    ...f,
                    therapist_id: e.target.value,
                    ...(f.is_online && !f.use_custom_link
                      ? { meeting_link: getTherapistMeetLink(e.target.value) }
                      : {}),
                  }))}
                  className={inputCls}
                >
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
              <div className="border-t border-sand/20 pt-3 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={assignForm.is_online}
                    onChange={(e) => setAssignForm((f) => ({
                      ...f,
                      is_online: e.target.checked,
                      room_id: e.target.checked ? "" : f.room_id,
                      meeting_link: e.target.checked ? getTherapistMeetLink(f.therapist_id) : "",
                      use_custom_link: false,
                    }))}
                    className="accent-forest w-4 h-4"
                  />
                  <span className="font-sans text-sm text-deep">線上諮商</span>
                </label>

                {assignForm.is_online && (
                  <div className="pl-6 border-l-2 border-forest/20 space-y-2">
                    {!assignForm.use_custom_link ? (
                      <div>
                        <p className="font-sans text-[11px] text-muted mb-1">視訊連結（Google Meet）</p>
                        {assignForm.meeting_link ? (
                          <p className="font-sans text-[11px] text-forest/80 bg-sand/10 px-3 py-2 break-all leading-relaxed">
                            {assignForm.meeting_link}
                          </p>
                        ) : (
                          <p className="font-sans text-[11px] text-amber-600 bg-amber-50 px-3 py-2">
                            ⚠ 此心理師尚未設定 Google Meet 連結，請至「成員管理」設定，或勾選下方改用其他連結。
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="font-sans text-[11px] text-muted block mb-1">視訊連結（請貼上）</label>
                        <input
                          value={assignForm.meeting_link}
                          onChange={(e) => setAssignForm((f) => ({ ...f, meeting_link: e.target.value }))}
                          className={inputCls}
                          placeholder="https://..."
                          autoFocus
                        />
                        {assignForm.meeting_link ? (
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
                        checked={assignForm.use_custom_link}
                        onChange={(e) => setAssignForm((f) => ({
                          ...f,
                          use_custom_link: e.target.checked,
                          meeting_link: e.target.checked ? "" : getTherapistMeetLink(f.therapist_id),
                        }))}
                        className="accent-amber-600 w-3 h-3"
                      />
                      <span className="font-sans text-[11px] text-muted/70">不使用 Google Meet，改用其他連結</span>
                    </label>
                  </div>
                )}
              </div>
              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">預定時間（今天之後）</label>
                <div className="flex gap-2 items-center">
                  <input type="date" value={assignForm.scheduled_date} min={todayInMacau()} onChange={(e) => setAssignForm((f) => ({ ...f, scheduled_date: e.target.value }))} className="flex-1 border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50" />
                  <select value={assignForm.scheduled_time ? assignForm.scheduled_time.slice(0, 2) : ""} onChange={(e) => { const hh = e.target.value; const mm = assignForm.scheduled_time ? (assignForm.scheduled_time.slice(3, 5) || "00") : "00"; setAssignForm((f) => ({ ...f, scheduled_time: hh ? `${hh}:${mm}` : "" })); }} className="border border-sand/30 px-2 py-2 font-sans text-sm text-deep bg-white focus:outline-none focus:border-forest/50"><option value="">時</option>{Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => <option key={h} value={h}>{h}</option>)}</select>
                  <span className="text-muted text-sm">:</span>
                  <select value={assignForm.scheduled_time ? assignForm.scheduled_time.slice(3, 5) : ""} onChange={(e) => { const mm = e.target.value; const hh = assignForm.scheduled_time ? (assignForm.scheduled_time.slice(0, 2) || "09") : "09"; setAssignForm((f) => ({ ...f, scheduled_time: mm ? `${hh}:${mm}` : "" })); }} className="border border-sand/30 px-2 py-2 font-sans text-sm text-deep bg-white focus:outline-none focus:border-forest/50"><option value="">分</option>{["00", "15", "30", "45"].map((m) => <option key={m} value={m}>{m}</option>)}</select>
                </div>
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
          <div className="bg-white p-6 w-full max-w-sm space-y-4 shadow-sm" onClick={(e) => e.stopPropagation()}>
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

      {/* ── Reschedule Modal ── */}
      {rescheduleModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={() => setRescheduleModal(null)}>
          <div className="bg-white p-6 w-full max-w-sm space-y-4 shadow-sm" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="font-serif text-deep text-lg">修改預約時間</h2>
              <p className="font-sans text-xs text-muted mt-1">
                個案：{clientLabel(rescheduleModal)}
                {rescheduleModal.therapist_id && ` · 心理師：${data.therapistMap[rescheduleModal.therapist_id] ?? "—"}`}
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="font-sans text-xs text-muted block mb-1">新的預約時間</label>
                <div className="flex gap-2 items-center">
                  <input type="date" value={rescheduleForm.scheduled_date} min={todayInMacau()} onChange={(e) => setRescheduleForm((f) => ({ ...f, scheduled_date: e.target.value }))} className="flex-1 border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50" autoFocus />
                  <select value={rescheduleForm.scheduled_time ? rescheduleForm.scheduled_time.slice(0, 2) : ""} onChange={(e) => { const hh = e.target.value; const mm = rescheduleForm.scheduled_time ? (rescheduleForm.scheduled_time.slice(3, 5) || "00") : "00"; setRescheduleForm((f) => ({ ...f, scheduled_time: hh ? `${hh}:${mm}` : "" })); }} className="border border-sand/30 px-2 py-2 font-sans text-sm text-deep bg-white focus:outline-none focus:border-forest/50"><option value="">時</option>{Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => <option key={h} value={h}>{h}</option>)}</select>
                  <span className="text-muted text-sm">:</span>
                  <select value={rescheduleForm.scheduled_time ? rescheduleForm.scheduled_time.slice(3, 5) : ""} onChange={(e) => { const mm = e.target.value; const hh = rescheduleForm.scheduled_time ? (rescheduleForm.scheduled_time.slice(0, 2) || "09") : "09"; setRescheduleForm((f) => ({ ...f, scheduled_time: mm ? `${hh}:${mm}` : "" })); }} className="border border-sand/30 px-2 py-2 font-sans text-sm text-deep bg-white focus:outline-none focus:border-forest/50"><option value="">分</option>{["00", "15", "30", "45"].map((m) => <option key={m} value={m}>{m}</option>)}</select>
                </div>
              </div>
              <div>
                <label className="font-sans text-xs text-muted block mb-1">諮商室（選填）</label>
                <select
                  value={rescheduleForm.room_id}
                  onChange={(e) => setRescheduleForm((f) => ({ ...f, room_id: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">（維持原設定）</option>
                  {rooms.filter((r) => r.is_active).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {err && <p className="font-sans text-xs text-red-500">{err}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setRescheduleModal(null)} className="flex-1 font-sans text-xs py-2 border border-sand/30 text-muted hover:bg-sand/10 transition-colors">取消</button>
              <button onClick={doReschedule} disabled={working} className="flex-1 font-sans text-xs py-2 bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 transition-colors">
                {working ? "更新中…" : "確認修改"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={() => setDetailModal(null)}>
          <div className="bg-white p-6 w-full max-w-md space-y-3 shadow-sm max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-deep text-lg">{clientLabel(detailModal)}</h2>
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
              {detailModal.is_online && (
                <p className="text-forest font-medium">
                  線上晤談
                  {(() => {
                    const link = detailModal.meeting_link || therapists.find((t) => t.id === detailModal.therapist_id)?.google_meet_link;
                    return link
                      ? <> — <a href={link} target="_blank" rel="noopener noreferrer" className="underline break-all">{link}</a></>
                      : <span className="text-amber-600 font-normal"> — ⚠ 尚未設定視訊連結</span>;
                  })()}
                </p>
              )}
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
            <div className="flex gap-2 mt-2">
              <button onClick={() => setDetailModal(null)} className="flex-1 font-sans text-xs py-2 border border-sand/30 text-muted hover:bg-sand/10 transition-colors">
                關閉
              </button>
              {["confirmed", "locked", "pending_therapist"].includes(detailModal.booking_status) && (
                <button
                  onClick={() => openEditModal(detailModal)}
                  className="flex-1 font-sans text-xs py-2 bg-deep text-paper hover:bg-forest transition-colors"
                >
                  編輯詳情
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4" onClick={() => setEditModal(null)}>
          <div className="bg-white w-full max-w-sm shadow-sm overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div>
                <h2 className="font-serif text-deep text-lg">編輯預約詳情</h2>
                <p className="font-sans text-xs text-muted mt-0.5">{clientLabel(editModal)}</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editForm.is_online}
                      onChange={(e) => setEditForm((f) => ({
                        ...f,
                        is_online: e.target.checked,
                        room_id: e.target.checked ? "" : f.room_id,
                        meeting_link: e.target.checked ? f.meeting_link : "",
                      }))}
                      className="accent-forest w-4 h-4"
                    />
                    <span className="font-sans text-sm text-deep">線上諮商</span>
                  </label>
                  {editForm.is_online && (
                    <div className="pl-6 border-l-2 border-forest/20">
                      <label className="font-sans text-[11px] text-muted block mb-1">視訊連結</label>
                      <input
                        value={editForm.meeting_link}
                        onChange={(e) => setEditForm((f) => ({ ...f, meeting_link: e.target.value }))}
                        placeholder="https://meet.google.com/..."
                        className={inputCls}
                      />
                    </div>
                  )}
                </div>
                {!editForm.is_online && (
                  <div>
                    <label className="font-sans text-[11px] text-muted block mb-1">諮商室</label>
                    <select value={editForm.room_id} onChange={(e) => setEditForm((f) => ({ ...f, room_id: e.target.value }))} className={inputCls}>
                      <option value="">（未指定）</option>
                      {rooms.filter((r) => r.is_active).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                )}
                {!isTherapist && (
                  <>
                    <div>
                      <label className="font-sans text-[11px] text-muted block mb-1">費用</label>
                      <input type="number" value={editForm.session_fee} onChange={(e) => setEditForm((f) => ({ ...f, session_fee: e.target.value }))} placeholder="0" min="0" step="0.5" className={inputCls} />
                    </div>
                    <div>
                      <label className="font-sans text-[11px] text-muted block mb-1">排案說明</label>
                      <input value={editForm.arrangement_type} onChange={(e) => setEditForm((f) => ({ ...f, arrangement_type: e.target.value }))} placeholder="…" className={inputCls} />
                    </div>
                    <div>
                      <label className="font-sans text-[11px] text-muted block mb-1">行政備註</label>
                      <textarea value={editForm.admin_notes} onChange={(e) => setEditForm((f) => ({ ...f, admin_notes: e.target.value }))} rows={2} className={inputCls + " resize-none"} placeholder="內部備註…" />
                    </div>
                  </>
                )}
              </div>
              {err && <p className="font-sans text-xs text-red-500">{err}</p>}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditModal(null)} className="flex-1 font-sans text-xs py-2 border border-sand/30 text-muted hover:bg-sand/10 transition-colors">取消</button>
                <button onClick={doEdit} disabled={working} className="flex-1 font-sans text-xs py-2 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors">
                  {working ? "儲存中…" : "儲存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
