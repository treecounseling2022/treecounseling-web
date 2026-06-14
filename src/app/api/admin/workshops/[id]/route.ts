import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

async function adminGuard() {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) return null;
  return auth;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await adminGuard())) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const { id } = await params;

  const body = await req.json() as {
    title?: string;
    scheduled_at?: string;
    duration_hours?: number;
    hourly_rate?: number;
    total_fee?: number;
    status?: string;
    notes?: string;
  };

  const db = createAdminClient();
  const { data, error } = await db
    .from("workshop_events")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await adminGuard())) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const { id } = await params;

  const db = createAdminClient();

  // Guard: cannot delete completed workshops
  const { data: existing } = await db
    .from("workshop_events")
    .select("status")
    .eq("id", id)
    .single();

  if (existing?.status === "completed") {
    return NextResponse.json({ error: "已完成的活動不可刪除" }, { status: 400 });
  }

  const { error } = await db.from("workshop_events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
