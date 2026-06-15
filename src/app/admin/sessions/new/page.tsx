import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth-role";
import SessionNoteEditor from "../SessionNoteEditor";

interface Props {
  searchParams: Promise<{ appointment_id?: string }>;
}

export default async function NewSessionPage({ searchParams }: Props) {
  const auth = await requireAuth();
  if (auth.role !== "therapist" || !auth.profileId) redirect("/admin/sessions");

  const { appointment_id: preselectedId } = await searchParams;
  const supabase = await createClient();

  // Get therapist's confirmed/locked appointments without a note yet
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, scheduled_at, session_type, clients(full_name)")
    .eq("therapist_id", auth.profileId)
    .in("booking_status", ["confirmed", "locked"])
    .order("scheduled_at", { ascending: false })
    .limit(50);

  // Filter out appointments that already have notes
  const apptIds = (appointments ?? []).map((a) => a.id);
  let usedIds: string[] = [];
  if (apptIds.length > 0) {
    const { data: existing } = await supabase
      .from("session_notes")
      .select("appointment_id")
      .in("appointment_id", apptIds);
    usedIds = (existing ?? []).map((e) => e.appointment_id);
  }

  const available = (appointments ?? []).filter((a) => !usedIds.includes(a.id));

  return (
    <div className="space-y-6 pt-4 max-w-2xl">
      <div>
        <p className="font-sans text-xs text-muted mb-1">
          <a href="/admin" className="hover:text-forest">後台</a>
          {" / "}
          <a href="/admin/sessions" className="hover:text-forest">晤談紀錄</a>
          {" / "}
          新增紀錄
        </p>
        <h1 className="font-serif text-deep text-2xl">新增晤談紀錄</h1>
      </div>

      <SessionNoteEditor
        therapistId={auth.profileId}
        defaultAppointmentId={preselectedId}
        availableAppointments={available.map((a) => ({
          id: a.id,
          scheduled_at: a.scheduled_at,
          sessionType: (a.session_type as string | null) ?? "followup",
          clientName: (() => {
            const c = a.clients as { full_name: string } | { full_name: string }[] | null | undefined;
            return (Array.isArray(c) ? c[0]?.full_name : c?.full_name) ?? "未知";
          })(),
        }))}
      />
    </div>
  );
}
