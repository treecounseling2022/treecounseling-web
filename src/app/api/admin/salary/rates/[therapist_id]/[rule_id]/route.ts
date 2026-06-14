import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

async function adminGuard() {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) return null;
  return auth;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ therapist_id: string; rule_id: string }> }
) {
  if (!(await adminGuard())) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const { rule_id } = await params;

  const body = await req.json() as {
    commission_rate?: number | null;
    flat_amount?: number | null;
    free_sessions?: number;
    tier_config?: unknown;
    notes?: string | null;
    effective_from?: string;
    effective_to?: string | null;
  };

  const db = createAdminClient();
  const { data, error } = await db
    .from("therapist_rates")
    .update(body)
    .eq("id", rule_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
