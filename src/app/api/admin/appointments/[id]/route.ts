import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

type Action = "assign" | "confirm" | "reject" | "lock" | "cancel" | "complete";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });

  const { id } = await params;
  const body = await req.json() as { action: Action; [key: string]: unknown };
  const { action } = body;
  const db = createAdminClient();

  // Fetch current appointment
  const { data: appt, error: fetchErr } = await db
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !appt) return NextResponse.json({ error: "找不到預約" }, { status: 404 });

  let update: Record<string, unknown> = {};

  if (action === "assign") {
    // Admin assigns therapist/room/time → pending_therapist
    if (!isAdminLevel(auth.role)) return NextResponse.json({ error: "未授權" }, { status: 403 });
    if (!body.therapist_id) return NextResponse.json({ error: "請選擇心理師" }, { status: 400 });
    update = {
      therapist_id: body.therapist_id,
      room_id: body.room_id ?? null,
      scheduled_at: body.scheduled_at ?? null,
      session_fee: body.session_fee ?? null,
      plan_id: body.plan_id ?? null,
      arrangement_type: body.arrangement_type ?? null,
      booking_status: "pending_therapist",
      rejection_reason: null,
    };
  } else if (action === "confirm") {
    // Therapist confirms their appointment
    if (
      auth.role === "therapist" &&
      appt.therapist_id !== auth.profileId
    ) {
      return NextResponse.json({ error: "未授權" }, { status: 403 });
    }
    update = { booking_status: "confirmed" };
  } else if (action === "reject") {
    // Therapist rejects → back to pending_admin
    if (
      auth.role === "therapist" &&
      appt.therapist_id !== auth.profileId
    ) {
      return NextResponse.json({ error: "未授權" }, { status: 403 });
    }
    update = {
      booking_status: "pending_admin",
      therapist_id: null,
      room_id: null,
      scheduled_at: null,
      rejection_reason: body.rejection_reason ?? null,
    };
  } else if (action === "lock") {
    if (!isAdminLevel(auth.role)) return NextResponse.json({ error: "未授權" }, { status: 403 });
    update = { booking_status: "locked" };
  } else if (action === "complete") {
    if (!isAdminLevel(auth.role)) return NextResponse.json({ error: "未授權" }, { status: 403 });
    update = { status: "completed" };
  } else if (action === "cancel") {
    if (!isAdminLevel(auth.role)) return NextResponse.json({ error: "未授權" }, { status: 403 });
    update = { booking_status: "cancelled" };
  } else {
    // Generic update (admin only)
    if (!isAdminLevel(auth.role)) return NextResponse.json({ error: "未授權" }, { status: 403 });
    const { action: _a, ...rest } = body;
    update = rest;
  }

  const { data, error } = await db
    .from("appointments")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
