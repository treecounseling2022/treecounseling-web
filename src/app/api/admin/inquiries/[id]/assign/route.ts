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
    is_online?: boolean;
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
    const formData = (inquiry.form_data as Record<string, unknown>) ?? {};
    const GENDER_MAP: Record<string, string> = { "男": "male", "女": "female", "其他": "other" };
    const rawGender = formData.gender as string | undefined;

    const { data: newClient, error: clientErr } = await db
      .from("clients")
      .insert({
        full_name: inquiry.name ?? "未知",
        email: inquiry.email ?? null,
        phone: inquiry.phone ?? null,
        dob: (formData.birthday as string) || null,
        gender: rawGender ? (GENDER_MAP[rawGender] ?? null) : null,
        intake_notes: inquiry.concern ?? null,
        is_active: true,
      })
      .select("id")
      .single();
    if (clientErr || !newClient) {
      return NextResponse.json({ error: `建立個案失敗：${clientErr?.message}` }, { status: 500 });
    }
    clientId = newClient.id;
  }

  // Auto-detect intake: first ever appointment for this client
  const { count: existingApptCount } = await db
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .neq("booking_status", "cancelled");
  const sessionType = (existingApptCount ?? 0) === 0 ? "intake" : "followup";

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
      is_online: body.is_online ?? false,
      booking_status: "pending_therapist",
      session_type: sessionType,
    })
    .select()
    .single();
  if (apptErr) {
    return NextResponse.json({ error: `建立預約失敗：${apptErr.message}` }, { status: 500 });
  }

  // Mark inquiry as converted and store created client/appointment links
  await db
    .from("booking_inquiries")
    .update({ status: "converted", client_id: clientId, appointment_id: appt.id })
    .eq("id", id);

  return NextResponse.json({ success: true, appointment_id: appt.id, client_id: clientId }, { status: 201 });
}
