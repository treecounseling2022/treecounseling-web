import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

export async function GET(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const db = createAdminClient();

  let query = db
    .from("clients")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (auth.role === "therapist") {
    if (!auth.profileId) return NextResponse.json([], { status: 200 });
    query = query.eq("assigned_therapist_id", auth.profileId);
  } else if (!isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  if (q) query = query.ilike("full_name", `%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const body = await req.json();
  if (!body.full_name?.trim()) {
    return NextResponse.json({ error: "請填寫姓名" }, { status: 400 });
  }
  const db = createAdminClient();
  const { data, error } = await db.from("clients").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
