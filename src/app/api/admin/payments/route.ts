import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

export async function GET(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("client_id");
  const appointmentId = searchParams.get("appointment_id");

  const db = createAdminClient();
  let query = db.from("payments").select("*").order("created_at", { ascending: false });
  if (clientId)      query = query.eq("client_id", clientId);
  if (appointmentId) query = query.eq("appointment_id", appointmentId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const body = await req.json() as {
    appointment_id: string;
    client_id: string;
    amount: number;
    currency?: string;
    payment_method?: string;
    notes?: string;
  };

  if (!body.appointment_id || !body.client_id || !body.amount) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("payments")
    .insert({
      appointment_id: body.appointment_id,
      client_id: body.client_id,
      amount: body.amount,
      currency: body.currency ?? "MOP",
      payment_method: body.payment_method ?? "cash",
      status: "paid",
      paid_at: new Date().toISOString(),
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const body = await req.json() as { id: string; status?: string; notes?: string };
  if (!body.id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("payments")
    .update({ status: body.status, notes: body.notes })
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
