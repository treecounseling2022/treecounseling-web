import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const { id } = await params;
  const db = createAdminClient();
  const { data, error } = await db.from("clients").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  // Therapists may only view clients assigned to them
  if (auth.role === "therapist" && data?.assigned_therapist_id !== auth.profileId) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const { id } = await params;
  const body = await req.json() as Record<string, unknown> & {
    action?: string;
    closure_reason?: string;
    session_count?: number;
    goal_achieved?: string;
    summary?: string;
    admin_note?: string;
  };
  const db = createAdminClient();

  // Handle case closure action
  if (body.action === "close_case") {
    if (!body.closure_reason) {
      return NextResponse.json({ error: "請選擇結案原因" }, { status: 400 });
    }
    const now = new Date().toISOString();

    const [{ error: clientErr }, { error: closureErr }] = await Promise.all([
      db.from("clients")
        .update({ case_status: "closed", case_closed_at: now, is_active: false })
        .eq("id", id),
      db.from("case_closures").insert({
        client_id: id,
        closure_reason: body.closure_reason,
        session_count: body.session_count ?? null,
        goal_achieved: body.goal_achieved ?? null,
        summary: body.summary ?? null,
        admin_note: body.admin_note ?? null,
        closed_by: auth.userId,
      }),
    ]);

    if (clientErr) return NextResponse.json({ error: clientErr.message }, { status: 500 });
    if (closureErr) return NextResponse.json({ error: closureErr.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Handle case reopen
  if (body.action === "reopen_case") {
    const { error } = await db.from("clients")
      .update({ case_status: "active", case_closed_at: null, is_active: true })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // General update (strip action field)
  const { action: _a, ...rest } = body;
  const { data, error } = await db.from("clients").update(rest).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const { id } = await params;
  const db = createAdminClient();
  // Soft delete
  const { error } = await db.from("clients").update({ is_active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
