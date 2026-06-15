import type { SupabaseClient } from "@supabase/supabase-js";

export async function checkTimeConflict(
  db: SupabaseClient,
  therapistId: string,
  scheduledAt: string,
  durationMinutes: number = 50,
  excludeId?: string,
): Promise<string | null> {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const windowStart = new Date(start.getTime() - 24 * 3600 * 1000).toISOString();
  const windowEnd = new Date(end.getTime() + 24 * 3600 * 1000).toISOString();

  let query = db
    .from("appointments")
    .select("id, scheduled_at, duration_minutes, booking_status")
    .eq("therapist_id", therapistId)
    .in("booking_status", ["pending_admin", "pending_therapist", "confirmed", "locked"])
    .gte("scheduled_at", windowStart)
    .lte("scheduled_at", windowEnd);

  if (excludeId) query = query.neq("id", excludeId);

  const { data: nearby } = await query;
  for (const appt of nearby ?? []) {
    const aStart = new Date(appt.scheduled_at);
    const aEnd = new Date(aStart.getTime() + (appt.duration_minutes ?? 50) * 60_000);
    if (start < aEnd && end > aStart) {
      return `所選時段與心理師現有預約衝突（${aStart.toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}）`;
    }
  }
  return null;
}
