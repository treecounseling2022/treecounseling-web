import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, isAdminLevel } from "@/lib/auth-role";
import ClientEditor from "./ClientEditor";
import AdminAppointmentPayments from "./AdminAppointmentPayments";
import ClientContacts from "./ClientContacts";
import CaseClosurePanel from "./CaseClosurePanel";
import IntakePanel from "./IntakePanel";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  pending_admin: "待排案",
  pending_therapist: "待確認",
  confirmed: "已確認",
  locked: "鎖定",
  cancelled: "已取消",
};

export default async function ClientDetailPage({ params }: Props) {
  const auth = await requireAuth();
  const isAdmin = isAdminLevel(auth.role);

  const { id } = await params;
  const supabase = await createClient();
  const db = createAdminClient();

  // Use RLS client for initial auth check (respects row-level security)
  const { data: clientRLS } = await supabase
    .from("clients")
    .select("id, assigned_therapist_id, is_active")
    .eq("id", id)
    .single();

  if (!clientRLS) notFound();

  // Therapists may view clients assigned to them OR with confirmed/locked appointments
  if (!isAdmin) {
    const assignedToMe = clientRLS.assigned_therapist_id === auth.profileId;
    if (!assignedToMe && auth.profileId) {
      const { data: appt } = await supabase
        .from("appointments")
        .select("id")
        .eq("client_id", id)
        .eq("therapist_id", auth.profileId)
        .in("booking_status", ["confirmed", "locked"])
        .limit(1)
        .maybeSingle();
      if (!appt) notFound();
    } else if (!assignedToMe) {
      notFound();
    }
  }

  // Re-fetch full data with admin client (bypasses RLS column restrictions)
  // so therapists can see contact info (phone, email, emergency_contact)
  const { data: client } = await db
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (!client) notFound();

  const therapists = isAdmin
    ? ((await supabase.from("therapist_profiles").select("id, name").order("name")).data ?? [])
    : [];

  // ── Admin: load all data in one pass ──────────────────────────────────────
  type AdminAppt = {
    id: string;
    scheduled_at: string | null;
    booking_status: string;
    session_fee: number | null;
    currency: string;
    therapist_name: string | null;
  };
  type PaymentRow = {
    id: string; appointment_id: string; amount: number; currency: string;
    payment_method: string; status: string; paid_at: string | null;
  };
  type ContactRow = {
    id: string; content: string; created_by: string;
    created_at: string; updated_at: string;
  };

  let adminAppts: AdminAppt[] = [];
  let adminPayments: PaymentRow[] = [];
  let clientContacts: ContactRow[] = [];

  if (isAdmin) {
    const db = createAdminClient();

    const [{ data: contacts }, { data: appts }] = await Promise.all([
      db.from("client_contacts")
        .select("id, content, created_by, created_at, updated_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      db.from("appointments")
        .select("id, scheduled_at, booking_status, session_fee, currency, therapist_id")
        .eq("client_id", id)
        .neq("booking_status", "cancelled")
        .order("scheduled_at", { ascending: false }),
    ]);

    clientContacts = (contacts ?? []) as ContactRow[];

    if (appts && appts.length > 0) {
      const tIds = [...new Set(appts.map((a) => a.therapist_id).filter(Boolean))] as string[];
      const apptIds = appts.map((a) => a.id);

      const [nameRes, paymentRes] = await Promise.all([
        tIds.length > 0
          ? db.from("therapist_profiles").select("id, name").in("id", tIds)
          : Promise.resolve({ data: [] }),
        db.from("payments")
          .select("id, appointment_id, amount, currency, payment_method, status, paid_at")
          .in("appointment_id", apptIds)
          .eq("status", "paid"),
      ]);

      const nameMap = Object.fromEntries(((nameRes.data ?? []) as { id: string; name: string }[]).map((t) => [t.id, t.name]));
      adminAppts = appts.map((a) => ({
        ...a,
        therapist_name: a.therapist_id ? (nameMap[a.therapist_id] ?? null) : null,
      }));
      adminPayments = (paymentRes.data ?? []) as PaymentRow[];
    }
  }

  // ── Therapist: load own appointments + note status ─────────────────────────
  type ApptWithNote = {
    id: string;
    scheduled_at: string | null;
    booking_status: string;
    note: { id: string; is_submitted: boolean } | null;
  };
  let therapistAppointments: ApptWithNote[] = [];

  if (!isAdmin && auth.profileId) {
    const { data: appts } = await supabase
      .from("appointments")
      .select("id, scheduled_at, booking_status")
      .eq("client_id", id)
      .eq("therapist_id", auth.profileId)
      .neq("booking_status", "cancelled")
      .order("scheduled_at", { ascending: false });

    const apptIds = (appts ?? []).map((a) => a.id);
    let notesByAppt: Record<string, { id: string; is_submitted: boolean }> = {};
    if (apptIds.length > 0) {
      const { data: notes } = await supabase
        .from("session_notes")
        .select("id, appointment_id, is_submitted")
        .in("appointment_id", apptIds);
      notesByAppt = Object.fromEntries(
        (notes ?? []).map((n) => [n.appointment_id, { id: n.id, is_submitted: n.is_submitted }])
      );
    }

    therapistAppointments = (appts ?? []).map((a) => ({
      ...a,
      note: notesByAppt[a.id] ?? null,
    }));
  }

  // Type-safe access for columns added in later migrations
  const clientExt = client as typeof client & {
    case_status?: string | null;
    case_closed_at?: string | null;
    service_type?: string | null;
    couple_partner_id?: string | null;
    intake_token?: string | null;
    intake_summary?: string | null;
    intake_submitted_at?: string | null;
  };

  // Compute client statistics from loaded appointment data
  const countedAppts = adminAppts.filter(
    (a) => a.booking_status === "confirmed" || a.booking_status === "locked"
  );
  const totalSessions = countedAppts.length;
  const totalFees = countedAppts.reduce((s, a) => s + (a.session_fee ?? 0), 0);
  const paidTotal = adminPayments.reduce((s, p) => s + (p.amount ?? 0), 0);
  const lastSession = countedAppts
    .filter((a) => a.scheduled_at && new Date(a.scheduled_at) <= new Date())
    .sort((a, b) => new Date(b.scheduled_at!).getTime() - new Date(a.scheduled_at!).getTime())[0];
  const nextSession = countedAppts
    .filter((a) => a.scheduled_at && new Date(a.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0];

  // Partner data for couple clients
  type PartnerData = {
    id: string;
    full_name: string;
    dob: string | null;
    gender: string | null;
    phone: string | null;
    email: string | null;
  };
  let partnerData: PartnerData | null = null;
  if (clientExt.service_type === "couple" && clientExt.couple_partner_id) {
    const { data: p } = await db
      .from("clients")
      .select("id, full_name, dob, gender, phone, email")
      .eq("id", clientExt.couple_partner_id)
      .single();
    partnerData = (p as PartnerData | null);
  }

  const clientsLabel = isAdmin ? "個案管理" : "我的個案";

  return (
    <div className="space-y-6 pt-4 max-w-2xl">
      <div>
        <p className="font-sans text-xs text-muted mb-1">
          <a href="/admin" className="hover:text-forest">後台</a>
          {" / "}
          <a href="/admin/clients" className="hover:text-forest">{clientsLabel}</a>
          {" / "}
          {client.full_name}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-serif text-deep text-2xl">{client.full_name}</h1>
          {clientExt.service_type === "couple" && (
            <span className="font-sans text-[11px] bg-rose-50 text-rose-500 border border-rose-200 px-2 py-0.5">
              伴侶諮商
            </span>
          )}
        </div>
        <p className="font-sans text-xs text-muted mt-0.5">
          建立於 {new Date(client.created_at).toLocaleDateString("zh-TW")}
        </p>
      </div>

      {/* Statistics — admin only */}
      {isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "已確認次數", value: String(totalSessions), sub: "確認 + 鎖定" },
            { label: "總諮商費用", value: `MOP ${totalFees.toLocaleString()}`, sub: "全部累計" },
            { label: "已付款", value: `MOP ${paidTotal.toLocaleString()}`, sub: "付款記錄總計" },
            {
              label: "上次晤談",
              value: lastSession?.scheduled_at
                ? new Date(lastSession.scheduled_at).toLocaleDateString("zh-TW", { month: "short", day: "numeric" })
                : "—",
              sub: nextSession?.scheduled_at
                ? `下次：${new Date(nextSession.scheduled_at).toLocaleDateString("zh-TW", { month: "short", day: "numeric" })}`
                : "無下次預約",
            },
          ].map((c) => (
            <div key={c.label} className="bg-white border border-sand/20 px-4 py-3">
              <p className="font-sans text-[10px] text-muted/60">{c.label}</p>
              <p className="font-serif text-deep text-lg mt-0.5">{c.value}</p>
              <p className="font-sans text-[10px] text-muted/50 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Couple partner info — shown for both admin and therapist */}
      {clientExt.service_type === "couple" && partnerData && (
        <div className="bg-white border border-rose-100 rounded-sm overflow-hidden">
          <div className="bg-rose-50 px-5 py-3 flex items-center gap-2 border-b border-rose-100">
            <span className="font-sans text-xs text-rose-600 font-medium">伴侶諮商 — 配偶資料</span>
            <Link
              href={`/admin/clients/${partnerData.id}`}
              className="ml-auto font-sans text-xs text-forest hover:underline flex-shrink-0"
            >
              查看配偶頁面 →
            </Link>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="font-sans text-xs text-muted mb-1">姓名</p>
              <p className="font-sans text-sm text-deep font-medium">{partnerData.full_name}</p>
            </div>
            <div>
              <p className="font-sans text-xs text-muted mb-1">出生日期</p>
              <p className="font-sans text-sm text-deep">
                {partnerData.dob
                  ? (() => {
                      const birth = new Date(partnerData.dob!);
                      const age = new Date().getFullYear() - birth.getFullYear();
                      return `${partnerData.dob} （${age} 歲）`;
                    })()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="font-sans text-xs text-muted mb-1">性別</p>
              <p className="font-sans text-sm text-deep">
                {partnerData.gender === "male" ? "男"
                  : partnerData.gender === "female" ? "女"
                  : partnerData.gender === "other" ? "其他"
                  : partnerData.gender === "prefer_not_to_say" ? "不透露"
                  : "—"}
              </p>
            </div>
            <div>
              <p className="font-sans text-xs text-muted mb-1">電話</p>
              <p className="font-sans text-sm text-deep">{partnerData.phone || "—"}</p>
            </div>
            <div>
              <p className="font-sans text-xs text-muted mb-1">Email</p>
              <p className="font-sans text-sm text-deep">{partnerData.email || "—"}</p>
            </div>
          </div>
        </div>
      )}

      <ClientEditor
        initialData={client}
        therapists={therapists}
        readonly={!isAdmin}
      />

      {/* Admin: AI 初談 */}
      {isAdmin && (
        <IntakePanel
          clientId={id}
          intakeToken={clientExt.intake_token ?? null}
          intakeSummary={clientExt.intake_summary ?? null}
          intakeSubmittedAt={clientExt.intake_submitted_at ?? null}
        />
      )}

      {/* Admin: appointments + payment records */}
      {isAdmin && (
        <AdminAppointmentPayments
          clientId={id}
          initialAppts={adminAppts}
          initialPayments={adminPayments}
        />
      )}

      {/* Admin: contact records */}
      {isAdmin && (
        <ClientContacts
          clientId={id}
          initialContacts={clientContacts}
          currentUserId={auth.userId}
          isDirector={auth.role === "director"}
        />
      )}

      {/* Admin: case closure */}
      {isAdmin && (
        <CaseClosurePanel
          clientId={id}
          clientName={client.full_name}
          isClosed={clientExt.case_status === "closed"}
          closedAt={clientExt.case_closed_at ?? null}
        />
      )}

      {/* Therapist: appointments + session notes for this client */}
      {!isAdmin && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-deep text-lg">預約與晤談紀錄</h2>
            <Link
              href={`/admin/appointments/new?client_id=${client.id}`}
              className="font-sans text-xs bg-deep text-paper px-4 py-2 hover:bg-forest transition-colors"
            >
              + 新增預約
            </Link>
          </div>
          {therapistAppointments.length === 0 ? (
            <p className="font-sans text-xs text-muted/40 py-4">尚未有預約紀錄。</p>
          ) : (
            <div className="bg-white border border-sand/20 divide-y divide-sand/10">
              {therapistAppointments.map((appt) => {
                const canWrite =
                  (appt.booking_status === "confirmed" || appt.booking_status === "locked") &&
                  !appt.note;
                const hasNote = !!appt.note;

                return (
                  <div key={appt.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-sm text-deep">
                        {appt.scheduled_at
                          ? new Date(appt.scheduled_at).toLocaleString("zh-TW", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "（時間待定）"}
                      </p>
                      <p className="font-sans text-[11px] text-muted mt-0.5">
                        {STATUS_LABEL[appt.booking_status] ?? appt.booking_status}
                      </p>
                    </div>

                    {hasNote ? (
                      <Link
                        href={`/admin/sessions/${appt.note!.id}`}
                        className="font-sans text-[11px] text-forest hover:underline flex-shrink-0"
                      >
                        {appt.note!.is_submitted ? "查看紀錄 →" : "繼續編輯 →"}
                      </Link>
                    ) : canWrite ? (
                      <Link
                        href={`/admin/sessions/new?appointment_id=${appt.id}`}
                        className="font-sans text-[11px] bg-deep text-paper px-3 py-1 hover:bg-forest transition-colors flex-shrink-0"
                      >
                        填寫晤談紀錄
                      </Link>
                    ) : (
                      <span className="font-sans text-[11px] text-muted/40 flex-shrink-0">
                        尚未可填寫
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
