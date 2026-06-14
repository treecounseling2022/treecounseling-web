import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

async function adminGuard() {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) return null;
  return auth;
}

export async function GET() {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const db = createAdminClient();
  const { data, error } = await db
    .from("service_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!(await adminGuard())) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const body = await req.json();
  const db = createAdminClient();
  const { data, error } = await db.from("service_plans").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
