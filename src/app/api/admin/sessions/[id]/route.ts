import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });

  const { id } = await params;
  const db = createAdminClient();

  // Fetch note to check ownership
  const { data: note } = await db.from("session_notes").select("*").eq("id", id).single();
  if (!note) return NextResponse.json({ error: "找不到紀錄" }, { status: 404 });

  // Only the owning therapist can edit; admin can only read
  if (auth.role === "therapist" && note.therapist_id !== auth.profileId) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }
  if (!isAdminLevel(auth.role) && auth.role !== "therapist") {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }
  if (isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "行政僅可讀取紀錄" }, { status: 403 });
  }

  if (note.is_submitted) {
    return NextResponse.json({ error: "已提交的紀錄無法修改" }, { status: 400 });
  }

  const body = await req.json();
  const { data, error } = await db
    .from("session_notes")
    .update(body)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
