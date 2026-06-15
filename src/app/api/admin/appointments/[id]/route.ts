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
      is_online: (body.is_online as boolean | undefined) ?? false,
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
    // Notify admin of rejection (handled after DB update below)
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

  const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@treecounseling.com";
  const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://treecounseling-web.vercel.app";
  const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;
  const WHATSAPP_LINK = "https://wa.me/85362772234";

  const tdL = `style="color:#333;padding:8px 18px 8px 0;border-bottom:1px solid #e0e0e0;white-space:nowrap;font-size:14px;font-weight:600"`;
  const tdR = `style="padding:8px 0;border-bottom:1px solid #e0e0e0;font-size:14px;color:#111"`;

  // After admin assigns, send email to therapist
  if (action === "assign" && data?.therapist_id && process.env.RESEND_API_KEY) {
    const [{ data: therapistProfile }, { data: clientData }] = await Promise.all([
      db.from("therapist_profiles").select("name, email").eq("id", data.therapist_id).single(),
      data.client_id
        ? db.from("clients").select("full_name").eq("id", data.client_id).single()
        : Promise.resolve({ data: null }),
    ]);
    if (therapistProfile?.email) {
      const adminUrl = `${SITE}/admin/appointments`;
      await resend.emails.send({
        from: FROM,
        to: therapistProfile.email,
        subject: "【樹心理工作室】新派案通知",
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111;line-height:1.75;font-size:14px">
            <div style="background:#2d4a38;padding:24px 32px 20px">
              <p style="margin:0 0 4px;color:#a8c5b0;font-size:11px;letter-spacing:1.5px">TREE COUNSELING STUDIO</p>
              <p style="margin:0;color:#fff;font-size:18px;font-weight:600">新派案通知</p>
            </div>
            <div style="background:#fff;padding:28px 32px">
              <p style="margin:0 0 12px">您好，<strong>${therapistProfile.name ?? ""}</strong>，</p>
              <p style="margin:0 0 20px;color:#444">行政已為您安排一個新個案，請登入後台確認是否接案。</p>
              <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
                <tr><td ${tdL}>個案</td><td ${tdR}><strong>${clientData?.full_name ?? "—"}</strong></td></tr>
                ${data.scheduled_at ? `<tr><td ${tdL}>預計時間</td><td ${tdR}>${new Date(data.scheduled_at).toLocaleString("zh-TW", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Macau" })}</td></tr>` : ""}
              </table>
              <p><a href="${adminUrl}" style="display:inline-block;background:#2d4a38;color:#fff;padding:10px 22px;text-decoration:none;font-size:13px;font-weight:600">前往後台確認 →</a></p>
            </div>
            <div style="background:#f7f5ef;padding:14px 32px;text-align:center">
              <p style="margin:0;color:#999;font-size:11px">樹心理工作室　Tree Counseling Studio</p>
            </div>
          </div>
        `,
      }).catch(console.error);
    }
  }

  // After therapist rejects, notify admin
  if (action === "reject" && process.env.RESEND_API_KEY && ADMIN_EMAIL) {
    const [{ data: therapistProfile }, { data: clientData }] = await Promise.all([
      appt.therapist_id
        ? db.from("therapist_profiles").select("name").eq("id", appt.therapist_id).single()
        : Promise.resolve({ data: null }),
      appt.client_id
        ? db.from("clients").select("full_name").eq("id", appt.client_id).single()
        : Promise.resolve({ data: null }),
    ]);
    const adminUrl = `${SITE}/admin/appointments`;
    await resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: "【樹心理工作室】心理師拒絕接案通知",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111;line-height:1.75;font-size:14px">
          <div style="background:#7f1d1d;padding:24px 32px 20px">
            <p style="margin:0 0 4px;color:#fca5a5;font-size:11px;letter-spacing:1.5px">TREE COUNSELING STUDIO</p>
            <p style="margin:0;color:#fff;font-size:18px;font-weight:600">心理師拒絕接案</p>
          </div>
          <div style="background:#fff;padding:28px 32px">
            <p style="margin:0 0 20px;color:#444">以下預約已被心理師拒絕，請重新安排派案。</p>
            <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
              <tr><td ${tdL}>個案</td><td ${tdR}><strong>${clientData?.full_name ?? "—"}</strong></td></tr>
              <tr><td ${tdL}>原心理師</td><td ${tdR}>${therapistProfile?.name ?? "—"}</td></tr>
              ${body.rejection_reason ? `<tr><td ${tdL}>拒絕原因</td><td ${tdR}>${String(body.rejection_reason)}</td></tr>` : ""}
            </table>
            <p><a href="${adminUrl}" style="display:inline-block;background:#7f1d1d;color:#fff;padding:10px 22px;text-decoration:none;font-size:13px;font-weight:600">前往後台重新派案 →</a></p>
          </div>
          <div style="background:#f7f5ef;padding:14px 32px;text-align:center">
            <p style="margin:0;color:#999;font-size:11px">樹心理工作室　Tree Counseling Studio</p>
          </div>
        </div>
      `,
    }).catch(console.error);
  }

  // After therapist confirms, send email to client with full details
  if (action === "confirm" && data?.client_id && process.env.RESEND_API_KEY) {
    const [{ data: client }, { data: therapistProfile }] = await Promise.all([
      db.from("clients").select("full_name, email").eq("id", data.client_id).single(),
      data.therapist_id
        ? db.from("therapist_profiles").select("name").eq("id", data.therapist_id).single()
        : Promise.resolve({ data: null }),
    ]);
    if (client?.email) {
      const scheduledAt = data.scheduled_at
        ? new Date(data.scheduled_at).toLocaleString("zh-TW", {
            year: "numeric", month: "long", day: "numeric",
            weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Macau",
          })
        : "（待另行通知）";
      await resend.emails.send({
        from: FROM,
        to: client.email,
        subject: "【樹心理工作室】諮商晤談預約確認",
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111;line-height:1.75;font-size:14px">
            <div style="background:#2d4a38;padding:24px 32px 20px">
              <p style="margin:0 0 4px;color:#a8c5b0;font-size:11px;letter-spacing:1.5px">TREE COUNSELING STUDIO</p>
              <p style="margin:0;color:#fff;font-size:18px;font-weight:600">諮商晤談預約確認</p>
            </div>
            <div style="background:#fff;padding:28px 32px">
              <p style="margin:0 0 12px">您好，<strong>${client.full_name}</strong>，</p>
              <p style="margin:0 0 20px;color:#444">您的諮商晤談預約已由心理師確認，詳情如下：</p>
              <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
                <tr><td ${tdL}>晤談時間</td><td ${tdR}><strong>${scheduledAt}</strong></td></tr>
                ${therapistProfile?.name ? `<tr><td ${tdL}>晤談人員</td><td ${tdR}>${therapistProfile.name} 心理輔導師</td></tr>` : ""}
                <tr><td ${tdL}>晤談方式</td><td ${tdR}>${data.is_online ? "線上晤談（視訊）" : "到診面談"}</td></tr>
              </table>
              <div style="background:#f0f5f1;border-left:3px solid #5a8a6a;padding:14px 18px;margin:0 0 20px">
                <p style="margin:0;color:#2d4a38;font-size:13px;line-height:1.7">如需更改時間或取消，請於晤談前 <strong>24 小時</strong> 聯繫行政人員。</p>
              </div>
              <p style="margin:0 0 8px;color:#555;font-size:13px">有任何問題，歡迎透過 WhatsApp 聯繫我們：</p>
              <p><a href="${WHATSAPP_LINK}" style="display:inline-block;background:#25d366;color:#fff;padding:10px 22px;text-decoration:none;font-size:13px;font-weight:600">WhatsApp 聯繫我們 →</a></p>
            </div>
            <div style="background:#f7f5ef;padding:14px 32px;text-align:center">
              <p style="margin:0;color:#999;font-size:11px">樹心理工作室　Tree Counseling Studio</p>
            </div>
          </div>
        `,
      }).catch(console.error);
    }
  }

  return NextResponse.json(data);
}
