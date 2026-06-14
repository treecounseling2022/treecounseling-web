import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

export async function GET() {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const db = createAdminClient();

  let query = db
    .from("workshop_events")
    .select("*")
    .order("scheduled_at", { ascending: false });

  if (auth.role === "therapist" && auth.profileId) {
    query = query.eq("therapist_id", auth.profileId);
  } else if (!isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach therapist names
  const ids = [...new Set((data ?? []).map((w) => w.therapist_id).filter(Boolean))] as string[];
  let therapistMap: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: profiles } = await db
      .from("therapist_profiles")
      .select("id, name")
      .in("id", ids);
    therapistMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.name]));
  }

  return NextResponse.json({ workshops: data ?? [], therapistMap });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const body = await req.json() as {
    therapist_id: string;
    title: string;
    scheduled_at: string;
    duration_hours: number;
    hourly_rate: number;
    total_fee: number;
    notes?: string;
  };

  if (!body.therapist_id) return NextResponse.json({ error: "請選擇心理師" }, { status: 400 });
  if (!body.title?.trim()) return NextResponse.json({ error: "請填寫活動名稱" }, { status: 400 });
  if (!body.scheduled_at) return NextResponse.json({ error: "請選擇日期" }, { status: 400 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("workshop_events")
    .insert({
      therapist_id: body.therapist_id,
      title: body.title.trim(),
      scheduled_at: body.scheduled_at,
      duration_hours: body.duration_hours ?? 1,
      hourly_rate: body.hourly_rate ?? 0,
      total_fee: body.total_fee ?? 0,
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
