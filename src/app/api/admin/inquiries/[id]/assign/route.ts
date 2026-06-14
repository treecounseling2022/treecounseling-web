import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as {
    therapist_id: string;
    room_id?: string;
    scheduled_at?: string;
    session_fee?: number;
    plan_id?: string;
  };

  if (!body.therapist_id) {
    return NextResponse.json({ error: "請選擇心理師" }, { status: 400 });
  }

  const db = createAdminClient();

  // Fetch the inquiry
  const { data: inquiry, error: fetchErr } = await db
    .from("booking_inquiries")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !inquiry) {
    return NextResponse.json({ error: "找不到申請記錄" }, { status: 404 });
  }
  if (inquiry.status === "converted") {
    return NextResponse.json({ error: "此申請已派案" }, { status: 409 });
  }

  // Upsert client (match by email or phone)
  let clientId: string | null = null;
  if (inquiry.email || inquiry.phone) {
    const matchField = inquiry.email ? "email" : "phone";
    const matchValue = inquiry.email ?? inquiry.phone;
    const { data: existing } = await db
      .from("clients")
      .select("id")
      .eq(matchField, matchValue)
      .maybeSingle();
    if (existing) {
      clientId = existing.id;
    }
  }

  if (!clientId) {
    const { data: newClient, error: clientErr } = await db
      .from("clients")
      .insert({
        full_name: inquiry.name ?? "未知",
        email: inquiry.email ?? null,
        phone: inquiry.phone ?? null,
        is_active: true,
      })
      .select("id")
      .single();
    if (clientErr || !newClient) {
      return NextResponse.json({ error: `建立個案失敗：${clientErr?.message}` }, { status: 500 });
    }
    clientId = newClient.id;
  }

  // Create appointment in pending_therapist state
  const { data: appt, error: apptErr } = await db
    .from("appointments")
    .insert({
      client_id: clientId,
      therapist_id: body.therapist_id,
      room_id: body.room_id ?? null,
      scheduled_at: body.scheduled_at ?? null,
      session_fee: body.session_fee ?? null,
      plan_id: body.plan_id ?? null,
      booking_status: "pending_therapist",
      service_type: inquiry.service_type ?? null,
    })
    .select()
    .single();
  if (apptErr) {
    return NextResponse.json({ error: `建立預約失敗：${apptErr.message}` }, { status: 500 });
  }

  // Mark inquiry as converted
  await db
    .from("booking_inquiries")
    .update({ status: "converted" })
    .eq("id", id);

  return NextResponse.json({ success: true, appointment_id: appt.id, client_id: clientId }, { status: 201 });
}
