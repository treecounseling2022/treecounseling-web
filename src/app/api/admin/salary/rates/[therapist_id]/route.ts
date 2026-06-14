import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

async function adminGuard() {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) return null;
  return auth;
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ therapist_id: string }> }
) {
  if (!(await adminGuard())) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const { therapist_id } = await params;
  const db = createAdminClient();
  const { data } = await db
    .from("therapist_rates")
    .select("*")
    .eq("therapist_id", therapist_id)
    .is("effective_to", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json(data ?? null);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ therapist_id: string }> }
) {
  if (!(await adminGuard())) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const { therapist_id } = await params;
  const body = await req.json() as {
    commission_type: string;
    commission_rate?: number | null;
    flat_amount?: number | null;
    free_sessions?: number;
    tier_config?: unknown;
    notes?: string;
  };

  if (!body.commission_type) {
    return NextResponse.json({ error: "請選擇抽成類型" }, { status: 400 });
  }

  const db = createAdminClient();

  // Close existing active rate
  await db
    .from("therapist_rates")
    .update({ effective_to: new Date().toISOString().split("T")[0] })
    .eq("therapist_id", therapist_id)
    .is("effective_to", null);

  // Insert new rate
  const { data, error } = await db
    .from("therapist_rates")
    .insert({
      therapist_id,
      commission_type: body.commission_type,
      commission_rate: body.commission_rate ?? null,
      flat_amount: body.flat_amount ?? null,
      free_sessions: body.free_sessions ?? 0,
      tier_config: body.tier_config ?? null,
      notes: body.notes ?? null,
      effective_from: new Date().toISOString().split("T")[0],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
