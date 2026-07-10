import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";
import { todayInMacau } from "@/lib/utils";

const SESSION_TYPES = ["percentage", "tiered", "tiered_per_client", "flat_per_session"];
const EVENT_TYPES = ["event"];
const WORKSHOP_TYPES = ["workshop_pct"];

async function adminGuard() {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) return null;
  return auth;
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ therapist_id: string }> }
) {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const { therapist_id } = await params;
  // Therapists can only view their own rates
  if (!isAdminLevel(auth.role) && auth.profileId !== therapist_id) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }
  const db = createAdminClient();

  // Return ALL rules (current + historical) so the UI can show a timeline
  const { data, error } = await db
    .from("therapist_rates")
    .select("*")
    .eq("therapist_id", therapist_id)
    .order("effective_from", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const session = (data ?? []).filter((r) => SESSION_TYPES.includes(r.commission_type));
  const event = (data ?? []).filter((r) => EVENT_TYPES.includes(r.commission_type));
  const workshop = (data ?? []).filter((r) => WORKSHOP_TYPES.includes(r.commission_type));

  return NextResponse.json({ session, event, workshop });
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
    effective_from?: string;
  };

  if (!body.commission_type) {
    return NextResponse.json({ error: "請選擇抽成類型" }, { status: 400 });
  }

  const isEvent = EVENT_TYPES.includes(body.commission_type);
  const isWorkshop = WORKSHOP_TYPES.includes(body.commission_type);
  const typesToClose = isWorkshop ? WORKSHOP_TYPES : isEvent ? EVENT_TYPES : SESSION_TYPES;
  const today = todayInMacau();
  const effectiveFrom = body.effective_from || today;

  const db = createAdminClient();

  // Close only same-category active rates (keep other category untouched)
  await db
    .from("therapist_rates")
    .update({ effective_to: today })
    .eq("therapist_id", therapist_id)
    .is("effective_to", null)
    .in("commission_type", typesToClose);

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
      effective_from: effectiveFrom,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
