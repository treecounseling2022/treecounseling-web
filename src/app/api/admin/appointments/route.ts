import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

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
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.client_id) return NextResponse.json({ error: "請選擇個案" }, { status: 400 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("appointments")
    .insert({ ...body, booking_status: "pending_admin" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
