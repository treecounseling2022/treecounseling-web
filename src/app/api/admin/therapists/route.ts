import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo } from "@/lib/auth-role";

export async function GET() {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const db = createAdminClient();

  let query = db.from("therapist_profiles").select("id, name, name_en").order("name");
  if (auth.role === "therapist") {
    if (!auth.profileId) return NextResponse.json([], { status: 200 });
    query = query.eq("id", auth.profileId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
