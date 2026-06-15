import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, isAdminLevel } from "@/lib/auth-role";
import ClientEditor from "./ClientEditor";
import AdminAppointmentPayments from "./AdminAppointmentPayments";
import ClientContacts from "./ClientContacts";
import CaseClosurePanel from "./CaseClosurePanel";

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

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (!client) notFound();

  // Therapists may view clients assigned to them OR with confirmed/locked appointments
  if (!isAdmin) {
    const assignedToMe = client.assigned_therapist_id === auth.profileId;
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

  // Type-safe access for columns added in migrations 012/014
  const clientExt = client as typeof client & {
    case_status?: string | null;
    case_closed_at?: string | null;
  };

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
        <h1 className="font-serif text-deep text-2xl">{client.full_name}</h1>
        <p className="font-sans text-[11px] text-muted mt-0.5">
          建立於 {new Date(client.created_at).toLocaleDateString("zh-TW")}
        </p>
      </div>

      <ClientEditor
        initialData={client}
        therapists={therapists}
        readonly={!isAdmin}
      />

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
