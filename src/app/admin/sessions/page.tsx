import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth-role";

const PAGE_SIZE = 20;

const RISK_BADGE: Record<string, string> = {
  low:    "adm-badge-neutral",
  medium: "adm-badge-warning",
  high:   "adm-badge-danger",
};
const RISK_LABEL: Record<string, string> = {
  low: "低", medium: "中", high: "高",
};

interface Props {
  searchParams: Promise<{ q?: string; date_from?: string; date_to?: string; page?: string }>;
}

export default async function SessionsPage({ searchParams }: Props) {
  const auth = await requireAuth();
  const supabase = await createClient();

  const isTherapist = auth.role === "therapist";
  const isDirector  = auth.role === "director";

  if (isTherapist && !auth.profileId) redirect("/admin");

  const { q, date_from, date_to, page: pageParam } = await searchParams;
  const page    = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const clientQ = q?.trim() ?? "";

  // ── Step 1: resolve appointment IDs if any filter is active ──────────────
  const needsApptFilter = !!(dateFrom() || dateTo() || clientQ);
  let apptIdFilter: string[] | null = null;

  function dateFrom() { return date_from?.trim() || null; }
  function dateTo()   { return date_to?.trim()   || null; }

  if (needsApptFilter) {
    let apptQ = supabase.from("appointments").select("id");

    if (dateFrom()) apptQ = apptQ.gte("scheduled_at", `${dateFrom()}T00:00:00+08:00`);
    if (dateTo())   apptQ = apptQ.lte("scheduled_at", `${dateTo()}T23:59:59+08:00`);

    if (isTherapist) apptQ = apptQ.eq("therapist_id", auth.profileId!);

    if (clientQ) {
      const { data: matchedClients } = await supabase
        .from("clients")
        .select("id")
        .ilike("full_name", `%${clientQ}%`);
      const matchedIds = (matchedClients ?? []).map((c) => c.id);
      if (matchedIds.length === 0) {
        apptIdFilter = []; // guaranteed empty result
      } else {
        apptQ = apptQ.in("client_id", matchedIds);
      }
    }

    if (apptIdFilter === null) {
      const { data: appts } = await apptQ;
      apptIdFilter = (appts ?? []).map((a) => a.id);
    }
  }

  // ── Step 2: query session_notes ───────────────────────────────────────────
  let notes: Record<string, unknown>[] = [];
  let totalCount = 0;

  if (apptIdFilter === null || apptIdFilter.length > 0) {
    let q2 = supabase
      .from("session_notes")
      .select(
        `id, risk_level, is_submitted, submitted_at, updated_at, therapist_id, appointment_id,
         appointments!inner(scheduled_at, clients!appointments_client_id_fkey(full_name))`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (isTherapist)          q2 = q2.eq("therapist_id", auth.profileId!);
    if (apptIdFilter !== null) q2 = q2.in("appointment_id", apptIdFilter);

    const { data, count } = await q2;
    notes     = (data ?? []) as Record<string, unknown>[];
    totalCount = count ?? 0;
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ── Therapist names for admin/director ───────────────────────────────────
  let therapistMap: Record<string, string> = {};
  if (!isTherapist && notes.length > 0) {
    const tIds = [...new Set(notes.map((n) => n.therapist_id as string).filter(Boolean))];
    if (tIds.length > 0) {
      const { data: therapists } = await supabase
        .from("therapist_profiles")
        .select("id, name")
        .in("id", tIds);
      therapistMap = Object.fromEntries((therapists ?? []).map((t) => [t.id, t.name]));
    }
  }

  // ── Therapist: pending appointments needing notes ─────────────────────────
  type PendingAppt = { id: string; scheduled_at: string | null; clientName: string };
  let pendingAppts: PendingAppt[] = [];

  if (isTherapist && auth.profileId && !needsApptFilter) {
    const { data: appts } = await supabase
      .from("appointments")
      .select("id, scheduled_at, clients!appointments_client_id_fkey(full_name)")
      .eq("therapist_id", auth.profileId)
      .in("booking_status", ["confirmed", "locked"])
      .order("scheduled_at", { ascending: false });

    const existingIds = new Set(notes.map((n) => n.appointment_id as string));
    pendingAppts = (appts ?? [])
      .filter((a) => !existingIds.has(a.id))
      .map((a) => {
        const c = a.clients as { full_name: string } | { full_name: string }[] | null | undefined;
        return {
          id: a.id,
          scheduled_at: a.scheduled_at,
          clientName: (Array.isArray(c) ? c[0]?.full_name : c?.full_name) ?? "未知個案",
        };
      });
  }

  // ── Build URL helper ──────────────────────────────────────────────────────
  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (clientQ)     sp.set("q",         clientQ);
    if (dateFrom())  sp.set("date_from", dateFrom()!);
    if (dateTo())    sp.set("date_to",   dateTo()!);
    sp.set("page", String(p));
    return `/admin/sessions?${sp.toString()}`;
  }

  return (
    <div className="space-y-5 pt-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-deep text-2xl">晤談紀錄</h1>
          <p className="font-sans text-xs text-muted mt-0.5">
            {isTherapist ? "我的晤談紀錄" : isDirector ? "所有晤談紀錄" : "繳交狀態總覽"}
          </p>
        </div>
        {isTherapist && (
          <Link
            href="/admin/sessions/new"
            className="font-sans text-xs bg-deep text-paper px-4 py-2 hover:bg-forest transition-colors flex-shrink-0"
          >
            + 新增紀錄
          </Link>
        )}
      </div>

      {/* Pending notice for therapists */}
      {isTherapist && pendingAppts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 space-y-2">
          <p className="font-sans text-xs font-medium text-amber-800">以下預約尚未填寫晤談紀錄：</p>
          <div className="space-y-1.5">
            {pendingAppts.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3">
                <span className="font-sans text-xs text-amber-700">
                  {a.clientName}
                  {a.scheduled_at && (
                    <span className="ml-2 text-amber-600">
                      {new Date(a.scheduled_at).toLocaleDateString("zh-TW")}
                    </span>
                  )}
                </span>
                <Link
                  href={`/admin/sessions/new?appointment_id=${a.id}`}
                  className="font-sans text-[11px] bg-amber-600 text-white px-3 py-1 hover:bg-amber-700 transition-colors flex-shrink-0"
                >
                  填寫 →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="font-sans text-[10px] text-muted block mb-0.5">搜尋個案</label>
          <input
            name="q"
            defaultValue={clientQ}
            placeholder="姓名…"
            className="border border-sand/30 px-3 py-1.5 font-sans text-xs text-deep focus:outline-none focus:border-forest/50 w-36"
          />
        </div>
        <div>
          <label className="font-sans text-[10px] text-muted block mb-0.5">晤談日期從</label>
          <input
            type="date"
            name="date_from"
            defaultValue={dateFrom() ?? ""}
            className="border border-sand/30 px-3 py-1.5 font-sans text-xs text-deep focus:outline-none focus:border-forest/50"
          />
        </div>
        <div>
          <label className="font-sans text-[10px] text-muted block mb-0.5">至</label>
          <input
            type="date"
            name="date_to"
            defaultValue={dateTo() ?? ""}
            className="border border-sand/30 px-3 py-1.5 font-sans text-xs text-deep focus:outline-none focus:border-forest/50"
          />
        </div>
        <button
          type="submit"
          className="font-sans text-xs px-4 py-1.5 bg-sand/20 text-muted hover:bg-sand/30 transition-colors"
        >
          篩選
        </button>
        {(clientQ || dateFrom() || dateTo()) && (
          <a
            href="/admin/sessions"
            className="font-sans text-xs px-3 py-1.5 text-muted/60 hover:text-muted transition-colors"
          >
            清除
          </a>
        )}
      </form>

      {/* Table */}
      <div className="bg-white border border-sand/20 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-sand/20">
              <th className="font-sans text-[11px] text-muted text-left px-4 py-3">個案</th>
              <th className="font-sans text-[11px] text-muted text-left px-4 py-3">晤談日期</th>
              {!isTherapist && (
                <th className="font-sans text-[11px] text-muted text-left px-4 py-3 hidden md:table-cell">心理師</th>
              )}
              <th className="font-sans text-[11px] text-muted text-left px-4 py-3">風險</th>
              <th className="font-sans text-[11px] text-muted text-left px-4 py-3">狀態</th>
              {(isTherapist || isDirector) && (
                <th className="px-4 py-3" />
              )}
            </tr>
          </thead>
          <tbody>
            {notes.map((note, i) => {
              const appt = Array.isArray(note.appointments)
                ? (note.appointments as Record<string, unknown>[])[0]
                : note.appointments as Record<string, unknown> | null;
              const rawClients = appt?.clients as { full_name: string } | { full_name: string }[] | null | undefined;
              const clientName = Array.isArray(rawClients)
                ? rawClients[0]?.full_name
                : rawClients?.full_name;
              const scheduledAt = appt?.scheduled_at as string | null;
              const riskLevel   = note.risk_level as string | null;
              const isSubmitted = note.is_submitted as boolean;

              return (
                <tr
                  key={note.id as string}
                  className={`border-b border-sand/10 hover:bg-sand/5 transition-colors ${i % 2 !== 0 ? "bg-sand/5" : ""}`}
                >
                  <td className="px-4 py-3 font-sans text-sm text-deep">
                    {clientName ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-sans text-xs text-muted whitespace-nowrap">
                    {scheduledAt
                      ? new Date(scheduledAt).toLocaleDateString("zh-TW", {
                          year: "numeric", month: "short", day: "numeric",
                        })
                      : "—"}
                  </td>
                  {!isTherapist && (
                    <td className="px-4 py-3 font-sans text-xs text-muted hidden md:table-cell">
                      {note.therapist_id ? therapistMap[note.therapist_id as string] ?? "—" : "—"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {riskLevel && riskLevel !== "none" ? (
                      <span className={`font-sans text-[10px] px-1.5 py-0.5 ${RISK_BADGE[riskLevel] ?? ""}`}>
                        {RISK_LABEL[riskLevel] ?? riskLevel}
                      </span>
                    ) : (
                      <span className="font-sans text-[10px] text-muted/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-sans text-[10px] px-2 py-0.5 ${
                      isSubmitted ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {isSubmitted ? "已提交" : "草稿"}
                    </span>
                  </td>
                  {(isTherapist || isDirector) && (
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/sessions/${note.id as string}`}
                        className="font-sans text-[11px] text-forest hover:underline whitespace-nowrap"
                      >
                        {isTherapist && !isSubmitted ? "編輯" : "查看"} →
                      </Link>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {notes.length === 0 && (
          <div className="text-center py-12 font-sans text-xs text-muted/40">
            {needsApptFilter ? "找不到符合條件的紀錄。" : isTherapist ? "您尚未建立任何晤談紀錄。" : "尚未有任何晤談紀錄。"}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between font-sans text-xs text-muted">
          <span>共 {totalCount} 筆，第 {page} / {totalPages} 頁</span>
          <div className="flex gap-1">
            {page > 1 && (
              <a href={pageUrl(page - 1)} className="px-3 py-1.5 border border-sand/30 hover:bg-sand/10 transition-colors">
                ‹ 上一頁
              </a>
            )}
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7
                ? i + 1
                : page <= 4 ? i + 1
                : page >= totalPages - 3 ? totalPages - 6 + i
                : page - 3 + i;
              return (
                <a
                  key={p}
                  href={pageUrl(p)}
                  className={`px-3 py-1.5 border transition-colors ${
                    p === page
                      ? "border-deep bg-deep text-paper"
                      : "border-sand/30 hover:bg-sand/10"
                  }`}
                >
                  {p}
                </a>
              );
            })}
            {page < totalPages && (
              <a href={pageUrl(page + 1)} className="px-3 py-1.5 border border-sand/30 hover:bg-sand/10 transition-colors">
                下一頁 ›
              </a>
            )}
          </div>
        </div>
      )}

      {isTherapist && (
        <div className="bg-sand/10 border border-sand/20 px-4 py-3">
          <p className="font-sans text-[11px] text-muted">
            晤談紀錄提交後即無法修改。草稿狀態下可隨時編輯。所長可查看已提交紀錄的完整內容。
          </p>
        </div>
      )}
    </div>
  );
}
