import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

export async function GET() {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });

  const db = createAdminClient();
  // 回傳完整費率歷史（含已失效的舊費率），讓薪酬計算能依場次日期對應到當時生效的費率
  let query = db
    .from("therapist_rates")
    .select("*")
    .order("effective_from", { ascending: false });

  if (auth.role === "therapist") {
    if (!auth.profileId) return NextResponse.json([], { status: 200 });
    query = query.eq("therapist_id", auth.profileId);
  } else if (!isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
