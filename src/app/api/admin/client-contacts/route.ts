import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

export async function GET(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const clientId = new URL(req.url).searchParams.get("client_id");
  if (!clientId) return NextResponse.json({ error: "缺少 client_id" }, { status: 400 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("client_contacts")
    .select("id, content, created_by, created_at, updated_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const body = await req.json() as { client_id: string; content: string };
  if (!body.client_id || !body.content?.trim()) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("client_contacts")
    .insert({
      client_id: body.client_id,
      content: body.content.trim(),
      created_by: auth.userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const body = await req.json() as { id: string; content: string };
  if (!body.id || !body.content?.trim()) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  const db = createAdminClient();

  // Only writer or director can edit
  const { data: existing } = await db
    .from("client_contacts").select("created_by").eq("id", body.id).single();
  if (!existing) return NextResponse.json({ error: "找不到紀錄" }, { status: 404 });
  if (existing.created_by !== auth.userId && auth.role !== "director") {
    return NextResponse.json({ error: "只有填寫人或院長才能修改" }, { status: 403 });
  }

  const { data, error } = await db
    .from("client_contacts")
    .update({ content: body.content.trim() })
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const db = createAdminClient();
  const { data: existing } = await db
    .from("client_contacts").select("created_by").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "找不到紀錄" }, { status: 404 });
  if (existing.created_by !== auth.userId && auth.role !== "director") {
    return NextResponse.json({ error: "只有填寫人或院長才能刪除" }, { status: 403 });
  }

  const { error } = await db.from("client_contacts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
