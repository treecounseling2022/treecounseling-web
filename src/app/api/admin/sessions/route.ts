import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo } from "@/lib/auth-role";

export async function POST(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth || auth.role !== "therapist") {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.appointment_id) return NextResponse.json({ error: "請選擇預約" }, { status: 400 });
  if (!body.content?.trim()) return NextResponse.json({ error: "請填寫晤談摘要" }, { status: 400 });

  const db = createAdminClient();
  // Ensure therapist owns this appointment
  const { data: appt } = await db
    .from("appointments")
    .select("therapist_id")
    .eq("id", body.appointment_id)
    .single();
  if (!appt || appt.therapist_id !== auth.profileId) {
    return NextResponse.json({ error: "無法存取此預約" }, { status: 403 });
  }

  const { data, error } = await db
    .from("session_notes")
    .insert({ ...body, therapist_id: auth.profileId })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
