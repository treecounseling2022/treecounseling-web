import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";
import { checkTimeConflict } from "@/lib/appointments";
import { generateClientPDF } from "@/lib/generate-client-pdf";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const db = createAdminClient();

  let query = db
    .from("appointments")
    .select("*, clients!client_id(id, full_name, phone), rooms!room_id(id, name, color)")
    .order("created_at", { ascending: false });

  if (auth.role === "therapist" && auth.profileId) {
    query = query.eq("therapist_id", auth.profileId);
  } else if (!isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const { data: appointments, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const therapistIds = [
    ...new Set((appointments ?? []).map((a) => a.therapist_id).filter(Boolean)),
  ] as string[];
  let therapistMap: Record<string, string> = {};
  if (therapistIds.length > 0) {
    const { data: therapists } = await db
      .from("therapist_profiles")
      .select("id, name")
      .in("id", therapistIds);
    therapistMap = Object.fromEntries((therapists ?? []).map((t) => [t.id, t.name]));
  }

  return NextResponse.json({ appointments: appointments ?? [], therapistMap });
}

// ── 共用：新預約後通知行政（PDF + email）────────────────────────────────────────
async function notifyAdminNewAppointment(clientId: string) {
  const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@treecounseling.com";
  const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!ADMIN_EMAIL || !process.env.RESEND_API_KEY) return;

  const { pdfBuffer, fileName, clientName, driveUrl } =
    await generateClientPDF(clientId, "預約資料");

  const driveNote = driveUrl
    ? `<p style="margin:12px 0 0;font-size:12px;color:#888">Drive 連結：<a href="${driveUrl}" style="color:#2d4a38">${driveUrl}</a></p>`
    : "";

  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `【新預約】${clientName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111;font-size:14px;line-height:1.75">
        <div style="background:#2d4a38;padding:20px 28px">
          <p style="margin:0;color:#a8c5b0;font-size:11px;letter-spacing:1.5px">TREE COUNSELING STUDIO</p>
          <p style="margin:4px 0 0;color:#fff;font-size:17px;font-weight:600">新預約通知 — ${clientName}</p>
        </div>
        <div style="background:#fff;padding:24px 28px">
          <p style="margin:0 0 12px;color:#444">已收到新預約申請，詳細資料請見附件。</p>
          ${driveNote}
        </div>
        <div style="background:#f7f5ef;padding:12px 28px;text-align:center">
          <p style="margin:0;color:#999;font-size:11px">樹心理工作室 Tree Counseling Studio</p>
        </div>
      </div>
    `,
    attachments: [{ filename: fileName, content: pdfBuffer }],
  });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });

  const body = await req.json();
  const db = createAdminClient();

  // ── Therapist self-booking ──────────────────────────────────────────────────
  if (auth.role === "therapist" && auth.profileId) {
    if (!body.client_id) return NextResponse.json({ error: "缺少個案" }, { status: 400 });
    if (!body.scheduled_at) return NextResponse.json({ error: "請選擇晤談時間" }, { status: 400 });

    const [{ data: assignedClient }, { data: prevAppt }] = await Promise.all([
      db.from("clients")
        .select("id, full_name, email")
        .eq("id", body.client_id)
        .eq("assigned_therapist_id", auth.profileId)
        .maybeSingle(),
      db.from("appointments")
        .select("id")
        .eq("client_id", body.client_id)
        .eq("therapist_id", auth.profileId)
        .in("booking_status", ["confirmed", "locked"])
        .limit(1)
        .maybeSingle(),
    ]);

    if (!assignedClient && !prevAppt) {
      return NextResponse.json({ error: "無法為此個案新增預約" }, { status: 403 });
    }

    const client = assignedClient ?? (
      await db.from("clients").select("id, full_name, email").eq("id", body.client_id).single()
    ).data;

    const { count: existingCount } = await db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("client_id", body.client_id)
      .neq("booking_status", "cancelled");
    const sessionType = (existingCount ?? 0) === 0 ? "intake" : "followup";

    const conflict = await checkTimeConflict(db, auth.profileId, body.scheduled_at, body.duration_minutes ?? 50);
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });

    const { data: newAppt, error } = await db
      .from("appointments")
      .insert({
        client_id: body.client_id,
        therapist_id: auth.profileId,
        scheduled_at: body.scheduled_at,
        room_id: body.room_id ?? null,
        session_fee: body.session_fee ?? null,
        plan_id: body.plan_id ?? null,
        duration_minutes: body.duration_minutes ?? 50,
        is_online: body.is_online ?? false,
        meeting_link: body.is_online ? (body.meeting_link ?? null) : null,
        admin_notes: body.admin_notes ?? null,
        booking_status: "confirmed",
        session_type: sessionType,
        couple_session_type: body.couple_session_type ?? null,
        couple_partner_client_id: body.couple_partner_client_id ?? null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // PDF + admin notification + client confirmation email（並行，錯誤不影響回應）
    const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@treecounseling.com";
    const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://treecounseling.com";
    const WHATSAPP_LINK = "https://wa.me/85362772234";

    await Promise.allSettled([
      // 1. 行政通知（PDF）
      notifyAdminNewAppointment(body.client_id),

      // 2. 個案確認 email（含初談連結）
      (async () => {
        if (!process.env.RESEND_API_KEY) return;

        const { data: clientFull } = await db
          .from("clients")
          .select("full_name, email, intake_token, intake_submitted_at")
          .eq("id", body.client_id)
          .single();
        if (!clientFull?.email) return;

        const { data: therapistProfile } = await db
          .from("therapist_profiles")
          .select("name, title")
          .eq("id", auth.profileId)
          .single();

        const scheduledAt = new Date(body.scheduled_at).toLocaleString("zh-TW", {
          year: "numeric", month: "long", day: "numeric",
          weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Macau",
        });

        const cf = clientFull as typeof clientFull & { intake_token?: string | null; intake_submitted_at?: string | null };
        const intakeSection = cf.intake_token && !cf.intake_submitted_at
          ? `<div style="background:#f7f5ef;border:1px solid #d4c9b0;padding:18px 20px;margin:0 0 20px">
              <p style="margin:0 0 6px;color:#2d4a38;font-size:13px;font-weight:600">📋 預約前準備（選填）</p>
              <p style="margin:0 0 12px;color:#555;font-size:13px;line-height:1.7">為讓心理師在第一次晤談前更了解您的狀況，歡迎提前完成線上初談問卷。此步驟為選填，不填寫也不影響您的預約。</p>
              <a href="${SITE}/intake?token=${cf.intake_token}" style="display:inline-block;background:#2d4a38;color:#fff;padding:10px 22px;text-decoration:none;font-size:13px;font-weight:600">開始填寫初談問卷 →</a>
            </div>`
          : "";

        const tdL = `style="color:#333;padding:8px 18px 8px 0;border-bottom:1px solid #e0e0e0;white-space:nowrap;font-size:14px;font-weight:600"`;
        const tdR = `style="padding:8px 0;border-bottom:1px solid #e0e0e0;font-size:14px;color:#111"`;

        await resend.emails.send({
          from: FROM,
          to: clientFull.email,
          subject: "【樹心理工作室】諮商晤談預約確認",
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111;line-height:1.75;font-size:14px">
              <div style="background:#2d4a38;padding:24px 32px 20px">
                <p style="margin:0 0 4px;color:#a8c5b0;font-size:11px;letter-spacing:1.5px">TREE COUNSELING STUDIO</p>
                <p style="margin:0;color:#fff;font-size:18px;font-weight:600">諮商晤談預約確認</p>
              </div>
              <div style="background:#fff;padding:28px 32px">
                <p style="margin:0 0 12px">您好，<strong>${clientFull.full_name}</strong>，</p>
                <p style="margin:0 0 20px;color:#444">您的諮商晤談已安排如下：</p>
                <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
                  <tr><td ${tdL}>晤談時間</td><td ${tdR}><strong>${scheduledAt}</strong></td></tr>
                  ${therapistProfile?.name ? `<tr><td ${tdL}>晤談人員</td><td ${tdR}>${therapistProfile.name} ${(therapistProfile as unknown as { title?: string | null }).title ?? "心理輔導師"}</td></tr>` : ""}
                  <tr><td ${tdL}>晤談方式</td><td ${tdR}>${body.is_online ? "線上晤談（視訊）" : "面談"}</td></tr>
                </table>
                ${intakeSection}
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
        });
      })(),
    ]).catch(console.error);

    void client;
    return NextResponse.json(newAppt, { status: 201 });
  }

  // ── Admin booking ───────────────────────────────────────────────────────────
  if (!isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }
  if (!body.client_id) return NextResponse.json({ error: "請選擇個案" }, { status: 400 });

  const { count: existingCount } = await db
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("client_id", body.client_id)
    .neq("booking_status", "cancelled");
  const autoSessionType = (existingCount ?? 0) === 0 ? "intake" : "followup";

  if (body.therapist_id && body.scheduled_at) {
    const conflict = await checkTimeConflict(db, body.therapist_id, body.scheduled_at, body.duration_minutes ?? 50);
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });
  }

  const autoStatus = body.therapist_id && body.scheduled_at ? "pending_therapist" : "pending_admin";
  const { data, error } = await db
    .from("appointments")
    .insert({
      ...body,
      booking_status: body.booking_status ?? autoStatus,
      session_type: body.session_type ?? autoSessionType,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
