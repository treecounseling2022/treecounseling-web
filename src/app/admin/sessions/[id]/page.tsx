import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth-role";
import SessionNoteEditor from "../SessionNoteEditor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SessionDetailPage({ params }: Props) {
  const auth = await requireAuth();
  if (auth.role !== "therapist") redirect("/admin/sessions");

  const { id } = await params;
  const supabase = await createClient();

  const { data: note } = await supabase
    .from("session_notes")
    .select("*, appointments!inner(scheduled_at, clients(full_name))")
    .eq("id", id)
    .eq("therapist_id", auth.profileId ?? "")
    .single();

  if (!note) notFound();

  const appt = Array.isArray(note.appointments) ? note.appointments[0] : note.appointments;
  const rawClients = appt?.clients as { full_name: string } | { full_name: string }[] | null | undefined;
  const clientName = Array.isArray(rawClients)
    ? rawClients[0]?.full_name
    : rawClients?.full_name;

  const apptLabel = [
    clientName ?? "未知個案",
    appt?.scheduled_at
      ? new Date(appt.scheduled_at).toLocaleDateString("zh-TW")
      : "",
  ]
    .filter(Boolean)
    .join(" — ");

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
        initialContent={note.content ?? ""}
        initialSubmitted={note.is_submitted}
        appointmentLabel={apptLabel}
      />
    </div>
  );
}
