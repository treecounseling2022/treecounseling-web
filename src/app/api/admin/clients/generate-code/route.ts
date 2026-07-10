import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";
import { generateNextClientCode } from "@/lib/client-code";

export async function GET() {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const db = createAdminClient();
  const code = await generateNextClientCode(db);
  return NextResponse.json({ code });
}
