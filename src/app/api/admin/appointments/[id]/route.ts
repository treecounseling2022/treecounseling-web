import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";
import { checkTimeConflict } from "@/lib/appointments";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type Action = "assign" | "confirm" | "reject" | "lock" | "cancel" | "complete";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });

  const { id } = await params;
  const body = await req.json() as { action: Action; [key: string]: unknown };
  const { action } = body;
  const db = createAdminClient();

  // Fetch current appointment
  const { data: appt, error: fetchErr } = await db
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !appt) return NextResponse.json({ error: "找不到預約" }, { status: 404 });

  let update: Record<string, unknown> = {};

  if (action === "assign") {
    // Admin assigns therapist/room/time → pending_therapist
    if (!isAdminLevel(auth.role)) return NextResponse.json({ error: "未授權" }, { status: 403 });
    if (!body.therapist_id) return NextResponse.json({ error: "請選擇心理師" }, { status: 400 });
    // Conflict check when both therapist and time are specified
    if (body.scheduled_at) {
      const conflict = await checkTimeConflict(
        db,
        body.therapist_id as string,
        body.scheduled_at as string,
        (body.duration_minutes as number | undefined) ?? appt.duration_minutes ?? 50,
        id,
      );
      if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });
    }
    update = {
      therapist_id: body.therapist_id,
      room_id: body.room_id ?? null,
      scheduled_at: body.scheduled_at ?? null,
      session_fee: body.session_fee ?? null,
      plan_id: body.plan_id ?? null,
      arrangement_type: body.arrangement_type ?? null,
      booking_status: "pending_therapist",
      rejection_reason: null,
    };
    // Sync client's assigned_therapist_id so therapist sees this client immediately
    const { error: assignClientErr } = await db
      .from("clients")
      .update({ assigned_therapist_id: body.therapist_id })
      .eq("id", appt.client_id);
    if (assignClientErr) console.error("assign: clients update failed", assignClientErr.message);
  } else if (action === "confirm") {
    // Therapist confirms their appointment
    if (
      auth.role === "therapist" &&
      appt.therapist_id !== auth.profileId
    ) {
      return NextResponse.json({ error: "未授權" }, { status: 403 });
    }
    update = { booking_status: "confirmed" };
    // Sync assigned_therapist_id in case assign step didn't persist
    if (appt.therapist_id && appt.client_id) {
      const { error: confirmClientErr } = await db
        .from("clients")
        .update({ assigned_therapist_id: appt.therapist_id })
        .eq("id", appt.client_id);
      if (confirmClientErr) console.error("confirm: clients update failed", confirmClientErr.message);
    }
    // Send confirmation email to client after update (handled below)
  } else if (action === "reject") {
    // Therapist rejects → back to pending_admin
    if (
      auth.role === "therapist" &&
      appt.therapist_id !== auth.profileId
    ) {
      return NextResponse.json({ error: "未授權" }, { status: 403 });
    }
    update = {
      booking_status: "pending_admin",
      therapist_id: null,
      room_id: null,
      scheduled_at: null,
      rejection_reason: body.rejection_reason ?? null,
    };
  } else if (action === "lock") {
    if (!isAdminLevel(auth.role)) return NextResponse.json({ error: "未授權" }, { status: 403 });
    update = { booking_status: "locked" };
  } else if (action === "complete") {
    if (!isAdminLevel(auth.role)) return NextResponse.json({ error: "未授權" }, { status: 403 });
    update = { status: "completed" };
  } else if (action === "cancel") {
    if (!isAdminLevel(auth.role)) return NextResponse.json({ error: "未授權" }, { status: 403 });
    update = { booking_status: "cancelled" };
  } else {
    // Generic update (admin only)
    if (!isAdminLevel(auth.role)) return NextResponse.json({ error: "未授權" }, { status: 403 });
    const { action: _a, ...rest } = body;
    update = rest;
  }

  const { data, error } = await db
    .from("appointments")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // After therapist confirms, send email to client
  if (action === "confirm" && data?.client_id && process.env.RESEND_API_KEY) {
    const { data: client } = await db
      .from("clients")
      .select("full_name, email")
      .eq("id", data.client_id)
      .single();
    if (client?.email) {
      const scheduledAt = data.scheduled_at
        ? new Date(data.scheduled_at).toLocaleString("zh-TW", {
            year: "numeric", month: "long", day: "numeric",
            hour: "2-digit", minute: "2-digit", timeZone: "Asia/Macau",
          })
        : "（待另行通知）";
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@treecounseling.com",
        to: client.email,
        subject: "【樹心理工作室】預約確認通知",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#333;line-height:1.7">
            <h2 style="color:#2d4a38">預約確認通知</h2>
            <p>您好，${client.full_name}，</p>
            <p>您的預約已由心理師確認。</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:0.9rem">
              <tr><td style="color:#888;padding:4px 12px 4px 0;white-space:nowrap">預約時間</td><td>${scheduledAt}</td></tr>
            </table>
            <p>如需更改或取消，請儘早聯繫我們。</p>
            <p style="color:#888;font-size:0.85rem">— 樹心理工作室</p>
          </div>
        `,
      });
    }
  }

  return NextResponse.json(data);
}
