import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";
import { checkTimeConflict } from "@/lib/appointments";

export async function GET() {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const db = createAdminClient();

  // Admin sees all; therapist sees only their own
  let query = db
    .from("appointments")
    .select("*, clients(id, full_name, phone), rooms(id, name, color)")
    .order("created_at", { ascending: false });

  if (auth.role === "therapist" && auth.profileId) {
    query = query.eq("therapist_id", auth.profileId);
  } else if (!isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const { data: appointments, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch therapist names separately (text FK, no auto-join)
  const therapistIds = [
    ...new Set((appointments ?? []).map((a) => a.therapist_id).filter(Boolean)),
  ] as string[];
  let therapistMap: Record<string, string> = {};
  if (therapistIds.length > 0) {
    const { data: therapists } = await db
      .from("therapist_profiles")
      .select("id, name")
      .in("id", therapistIds);
    therapistMap = Object.fromEntries((therapists ?? []).map((t) => [t.id, t.name]));
  }

  return NextResponse.json({ appointments: appointments ?? [], therapistMap });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });

  const body = await req.json();
  const db = createAdminClient();

  // ── Therapist self-booking ──────────────────────────────────────────────────
  if (auth.role === "therapist" && auth.profileId) {
    if (!body.client_id) return NextResponse.json({ error: "缺少個案" }, { status: 400 });
    if (!body.scheduled_at) return NextResponse.json({ error: "請選擇晤談時間" }, { status: 400 });

    // Verify therapist has access to this client
    const [{ data: assignedClient }, { data: prevAppt }] = await Promise.all([
      db.from("clients")
        .select("id, full_name, email")
        .eq("id", body.client_id)
        .eq("assigned_therapist_id", auth.profileId)
        .maybeSingle(),
      db.from("appointments")
        .select("id")
        .eq("client_id", body.client_id)
        .eq("therapist_id", auth.profileId)
        .in("booking_status", ["confirmed", "locked"])
        .limit(1)
        .maybeSingle(),
    ]);

    if (!assignedClient && !prevAppt) {
      return NextResponse.json({ error: "無法為此個案新增預約" }, { status: 403 });
    }

    // Fetch client info if not already loaded
    const client = assignedClient ?? (
      await db.from("clients").select("id, full_name, email").eq("id", body.client_id).single()
    ).data;
    void client;

    // Auto-detect intake: first ever appointment for this client
    const { count: existingCount } = await db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("client_id", body.client_id)
      .neq("booking_status", "cancelled");
    const sessionType = (existingCount ?? 0) === 0 ? "intake" : "followup";

    // Conflict check
    const conflict = await checkTimeConflict(db, auth.profileId, body.scheduled_at, body.duration_minutes ?? 50);
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });

    // Create confirmed appointment directly
    const { data: newAppt, error } = await db
      .from("appointments")
      .insert({
        client_id: body.client_id,
        therapist_id: auth.profileId,
        scheduled_at: body.scheduled_at,
        room_id: body.room_id ?? null,
        session_fee: body.session_fee ?? null,
        plan_id: body.plan_id ?? null,
        duration_minutes: body.duration_minutes ?? 50,
        is_online: body.is_online ?? false,
        admin_notes: body.admin_notes ?? null,
        booking_status: "confirmed",
        session_type: sessionType,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(newAppt, { status: 201 });
  }

  // ── Admin booking ───────────────────────────────────────────────────────────
  if (!isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }
  if (!body.client_id) return NextResponse.json({ error: "請選擇個案" }, { status: 400 });

  // Auto-detect intake: first ever appointment for this client
  const { count: existingCount } = await db
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("client_id", body.client_id)
    .neq("booking_status", "cancelled");
  const autoSessionType = (existingCount ?? 0) === 0 ? "intake" : "followup";

  // Conflict check (only if therapist and time are both specified)
  if (body.therapist_id && body.scheduled_at) {
    const conflict = await checkTimeConflict(db, body.therapist_id, body.scheduled_at, body.duration_minutes ?? 50);
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });
  }

  const { data, error } = await db
    .from("appointments")
    .insert({
      ...body,
      booking_status: "pending_admin",
      session_type: body.session_type ?? autoSessionType,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
