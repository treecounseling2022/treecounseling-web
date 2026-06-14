import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

export async function GET() {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("booking_inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const { id, status, admin_notes } = await req.json();
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const patch: Record<string, string> = {};
  if (status) patch.status = status;
  if (admin_notes !== undefined) patch.admin_notes = admin_notes;

  const db = createAdminClient();
  const { error } = await db.from("booking_inquiries").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
