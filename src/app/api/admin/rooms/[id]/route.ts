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
  const body = await req.json();
  const db = createAdminClient();
  const { data, error } = await db.from("rooms").update(body).eq("id", id).select().single();
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
  const { error } = await db.from("rooms").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
