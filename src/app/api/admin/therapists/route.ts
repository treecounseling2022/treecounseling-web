import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

export async function GET() {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const db = createAdminClient();

  let query = db.from("therapist_profiles").select("id, name, name_en, services, google_meet_link").order("name");
  if (auth.role === "therapist") {
    if (!auth.profileId) return NextResponse.json([], { status: 200 });
    query = query.eq("id", auth.profileId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const body = await req.json() as { id: string; name: string; name_en?: string; title?: string };
  const { id, name, name_en, title } = body;

  if (!id || !name) {
    return NextResponse.json({ error: "ID 與姓名為必填" }, { status: 400 });
  }
  if (!/^[a-z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: "ID 只能包含小寫英文、數字、底線、連字號" }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db.from("therapist_profiles").insert({
    id,
    name,
    name_en: name_en || null,
    title: title || null,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: `ID「${id}」已被使用，請換一個` }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id });
}
