import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth-role";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SessionsPage() {
  const auth = await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from("session_notes")
    .select(`
      id,
      content,
      is_submitted,
      submitted_at,
      created_at,
      updated_at,
      therapist_id,
      appointment_id,
      appointments!inner(
        id,
        scheduled_at,
        clients(full_name)
      )
    `)
    .order("created_at", { ascending: false });

  // Therapist only sees their own notes
  if (auth.role === "therapist") {
    if (!auth.profileId) redirect("/admin");
    query = query.eq("therapist_id", auth.profileId);
  }

  const { data: notes } = await query;

  // Fetch therapist names for admin view
  let therapistMap: Record<string, string> = {};
  if (auth.role !== "therapist" && notes && notes.length > 0) {
    const therapistIds = [...new Set(notes.map((n) => n.therapist_id).filter(Boolean))] as string[];
    if (therapistIds.length > 0) {
      const { data: therapists } = await supabase
        .from("therapist_profiles")
        .select("id, name")
        .in("id", therapistIds);
      therapistMap = Object.fromEntries((therapists ?? []).map((t) => [t.id, t.name]));
    }
  }

  const isAdmin = auth.role !== "therapist";

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-sans text-xs text-muted mb-1">
            <a href="/admin" className="hover:text-forest">後台</a> / 晤談紀錄
          </p>
          <h1 className="font-serif text-deep text-2xl">晤談紀錄</h1>
          <p className="font-sans text-xs text-muted mt-0.5">
            {isAdmin ? "所有晤談紀錄（行政唯讀）" : "我的晤談紀錄"}
          </p>
        </div>
        {!isAdmin && (
          <Link
            href="/admin/sessions/new"
            className="font-sans text-xs bg-deep text-paper px-4 py-2 hover:bg-forest transition-colors flex-shrink-0"
          >
            + 新增紀錄
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {(notes ?? []).map((note) => {
          const appt = Array.isArray(note.appointments) ? note.appointments[0] : note.appointments;
          const rawClients = appt?.clients as { full_name: string } | { full_name: string }[] | null | undefined;
          const clientName = Array.isArray(rawClients)
            ? rawClients[0]?.full_name
            : rawClients?.full_name;

          return (
            <div key={note.id} className="bg-white border border-sand/20 p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-serif text-deep">
                    {clientName ?? "（未知個案）"}
                    {appt?.scheduled_at && (
                      <span className="font-sans text-sm text-muted ml-2">
                        {new Date(appt.scheduled_at).toLocaleDateString("zh-TW")}
                      </span>
                    )}
                  </p>
                  {isAdmin && note.therapist_id && (
                    <p className="font-sans text-xs text-muted/70 mt-0.5">
                      心理師：{therapistMap[note.therapist_id] ?? note.therapist_id}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`font-sans text-[10px] px-2 py-0.5 ${
                      note.is_submitted
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {note.is_submitted ? "已提交" : "草稿"}
                  </span>
                  {!isAdmin && (
                    <Link
                      href={`/admin/sessions/${note.id}`}
                      className="font-sans text-[11px] text-forest hover:underline"
                    >
                      {note.is_submitted ? "查看" : "編輯"} →
                    </Link>
                  )}
                </div>
              </div>

              {note.content ? (
                <p className="font-sans text-xs text-muted leading-relaxed line-clamp-3">
                  {note.content}
                </p>
              ) : (
                <p className="font-sans text-xs text-muted/40 italic">（尚未填寫內容）</p>
              )}

              <p className="font-sans text-[10px] text-muted/40 mt-2">
                {note.is_submitted && note.submitted_at
                  ? `提交於 ${fmtDate(note.submitted_at)}`
                  : `更新於 ${fmtDate(note.updated_at)}`}
              </p>
            </div>
          );
        })}

        {(notes ?? []).length === 0 && (
          <div className="text-center py-16 font-sans text-xs text-muted/40">
            {isAdmin ? "尚未有任何晤談紀錄。" : "您尚未建立任何晤談紀錄。"}
          </div>
        )}
      </div>

      {!isAdmin && (
        <div className="bg-sand/10 border border-sand/20 px-4 py-3">
          <p className="font-sans text-[11px] text-muted">
            晤談紀錄提交後即無法修改。草稿狀態下可隨時編輯。行政人員可查看所有已提交的紀錄。
          </p>
        </div>
      )}
    </div>
  );
}
