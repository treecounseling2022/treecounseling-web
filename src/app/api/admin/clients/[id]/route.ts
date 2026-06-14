import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const { id } = await params;
  const db = createAdminClient();
  const { data, error } = await db.from("clients").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  // Therapists may only view clients assigned to them
  if (auth.role === "therapist" && data?.assigned_therapist_id !== auth.profileId) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const db = createAdminClient();
  const { data, error } = await db.from("clients").update(body).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const { id } = await params;
  const db = createAdminClient();
  // Soft delete
  const { error } = await db.from("clients").update({ is_active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
