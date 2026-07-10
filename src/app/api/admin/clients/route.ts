import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";
import { CLIENT_CODE_PATTERN, generateNextClientCode } from "@/lib/client-code";

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
  let insertBody = body;
  let data, error;
  for (let attempt = 0; attempt < 5; attempt++) {
    ({ data, error } = await db.from("clients").insert(insertBody).select().single());
    if (!error) break;
    const isCodeCollision =
      error.code === "23505" && CLIENT_CODE_PATTERN.test(insertBody.client_code ?? "");
    if (!isCodeCollision) break;
    insertBody = { ...insertBody, client_code: await generateNextClientCode(db) };
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 新建伴侶個案時：同步共同欄位到對方，並互相建立反向連結
  const partnerId = body.couple_partner_id as string | null;
  if (body.service_type === "couple" && partnerId && data) {
    const sharedFields: Record<string, unknown> = {
      couple_partner_id: data.id,
    };
    if (body.presenting_concerns !== undefined) sharedFields.presenting_concerns = body.presenting_concerns;
    if (body.relationship_duration !== undefined) sharedFields.relationship_duration = body.relationship_duration;
    if (body.children_info !== undefined) sharedFields.children_info = body.children_info;
    if (body.intake_notes !== undefined) sharedFields.intake_notes = body.intake_notes;
    await db.from("clients").update(sharedFields).eq("id", partnerId);
  }

  return NextResponse.json(data, { status: 201 });
}
