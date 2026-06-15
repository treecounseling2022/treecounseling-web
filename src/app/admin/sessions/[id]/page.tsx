import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth-role";
import SessionNoteEditor from "../SessionNoteEditor";

interface Props {
  params: Promise<{ id: string }>;
}

const RISK_LABELS: Record<string, string> = {
  none: "無明顯風險",
  low: "低度風險",
  medium: "中度風險",
  high: "高度風險",
};

const RISK_COLORS: Record<string, string> = {
  none: "text-muted bg-sand/10",
  low: "text-blue-700 bg-blue-50",
  medium: "text-amber-700 bg-amber-50",
  high: "text-red-700 bg-red-50",
};

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="font-sans text-[11px] text-muted mb-1">{label}</p>
      <p className="font-sans text-sm text-deep leading-relaxed whitespace-pre-wrap border border-sand/20 bg-sand/5 px-3 py-2">
        {value}
      </p>
    </div>
  );
}

export default async function SessionDetailPage({ params }: Props) {
  const auth = await requireAuth();

  // Only therapist (own notes) and director may access this page
  if (auth.role === "admin") redirect("/admin/sessions");

  const { id } = await params;
  const supabase = await createClient();

  let noteQuery = supabase
    .from("session_notes")
    .select("*, appointments!inner(scheduled_at, session_type, clients(full_name))")
    .eq("id", id);

  if (auth.role === "therapist") {
    noteQuery = noteQuery.eq("therapist_id", auth.profileId ?? "");
  }

  const { data: note } = await noteQuery.single();
  if (!note) notFound();

  const appt = Array.isArray(note.appointments) ? note.appointments[0] : note.appointments;
  const rawClients = appt?.clients as { full_name: string } | { full_name: string }[] | null | undefined;
  const clientName = Array.isArray(rawClients) ? rawClients[0]?.full_name : rawClients?.full_name;
  const isIntake = (appt as { session_type?: string } | null)?.session_type === "intake";

  const apptLabel = [
    clientName ?? "未知個案",
    appt?.scheduled_at
      ? new Date(appt.scheduled_at).toLocaleDateString("zh-TW")
      : "",
    isIntake ? "【首次初談】" : "",
  ]
    .filter(Boolean)
    .join(" — ");

  const fields = {
    session_topic: note.session_topic ?? "",
    content: note.content ?? "",
    observations: note.observations ?? "",
    assessment: note.assessment ?? "",
    plan: note.plan ?? "",
    risk_level: note.risk_level ?? "none",
    risk_note: note.risk_note ?? "",
  };
  const intakeBackground = (note as { intake_background?: string | null }).intake_background ?? "";

  // Director: read-only view (no editor)
  if (auth.role === "director") {
    const riskLevel = note.risk_level ?? "none";
    return (
      <div className="space-y-6 pt-4 max-w-2xl">
        <div>
          <p className="font-sans text-xs text-muted mb-1">
            <a href="/admin" className="hover:text-forest">後台</a>
            {" / "}
            <a href="/admin/sessions" className="hover:text-forest">晤談紀錄</a>
            {" / "}
            {clientName ?? id}
          </p>
          <h1 className="font-serif text-deep text-2xl">晤談紀錄</h1>
          <p className="font-sans text-[11px] text-muted mt-0.5">{apptLabel}</p>
        </div>

        <div className="bg-green-50 border border-green-100 px-4 py-2 flex items-center gap-2">
          <span className="font-sans text-[10px] bg-green-100 text-green-700 px-2 py-0.5">已提交</span>
          {note.submitted_at && (
            <span className="font-sans text-xs text-green-600">
              {new Date(note.submitted_at).toLocaleString("zh-TW")}
            </span>
          )}
        </div>

        <div className="space-y-5">
          {isIntake && (
            <Field label="個案背景（首次初談）" value={(note as { intake_background?: string | null }).intake_background} />
          )}
          <Field label={isIntake ? "主要求助問題" : "本次呈現議題"} value={note.session_topic} />
          <Field label={isIntake ? "初談記錄" : "晤談摘要"} value={note.content} />
          <Field label="觀察紀錄" value={note.observations} />
          <Field label="評估" value={note.assessment} />
          <Field label="計畫" value={note.plan} />

          <div>
            <p className="font-sans text-[11px] text-muted mb-1">風險評估</p>
            <span className={`font-sans text-xs px-2 py-1 ${RISK_COLORS[riskLevel] ?? ""}`}>
              {RISK_LABELS[riskLevel] ?? riskLevel}
            </span>
            {note.risk_note && (
              <p className="font-sans text-sm text-deep leading-relaxed whitespace-pre-wrap border border-sand/20 bg-sand/5 px-3 py-2 mt-2">
                {note.risk_note}
              </p>
            )}
          </div>
        </div>

        <a href="/admin/sessions" className="font-sans text-xs text-forest hover:underline">
          ← 返回列表
        </a>
      </div>
    );
  }

  // Therapist: editable / read-only via SessionNoteEditor
  return (
    <div className="space-y-6 pt-4 max-w-2xl">
      <div>
        <p className="font-sans text-xs text-muted mb-1">
          <a href="/admin" className="hover:text-forest">後台</a>
          {" / "}
          <a href="/admin/sessions" className="hover:text-forest">晤談紀錄</a>
          {" / "}
          {clientName ?? id}
        </p>
        <h1 className="font-serif text-deep text-2xl">晤談紀錄</h1>
      </div>

      <SessionNoteEditor
        therapistId={auth.profileId!}
        noteId={note.id}
        initialFields={fields}
        initialIntakeBackground={intakeBackground}
        isIntake={isIntake}
        initialSubmitted={note.is_submitted}
        appointmentLabel={apptLabel}
      />
    </div>
  );
}
