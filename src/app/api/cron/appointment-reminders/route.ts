import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@treecounseling.com";
const WHATSAPP_LINK = "https://wa.me/85362772234";
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;

export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 401 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: "no RESEND_API_KEY" });
  }

  const db = createAdminClient();

  // Find appointments scheduled for tomorrow (Macau time, UTC+8)
  const now = new Date();
  const tomorrowStart = new Date(now);
  tomorrowStart.setUTCHours(tomorrowStart.getUTCHours() + 8); // convert to MO time
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
  tomorrowStart.setUTCHours(0, 0, 0, 0);
  tomorrowStart.setUTCHours(tomorrowStart.getUTCHours() - 8); // back to UTC

  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setUTCDate(tomorrowEnd.getUTCDate() + 1);

  const { data: appointments } = await db
    .from("appointments")
    .select("id, scheduled_at, is_online, meeting_link, therapist_id, clients!client_id(full_name, email), therapist_profiles:therapist_id(name, title)")
    .eq("booking_status", "confirmed")
    .gte("scheduled_at", tomorrowStart.toISOString())
    .lt("scheduled_at", tomorrowEnd.toISOString());

  if (!appointments || appointments.length === 0) {
    return NextResponse.json({ sent: 0, message: "no appointments tomorrow" });
  }

  const tdL = `style="color:#333;padding:8px 18px 8px 0;border-bottom:1px solid #e0e0e0;white-space:nowrap;font-size:14px;font-weight:600"`;
  const tdR = `style="padding:8px 0;border-bottom:1px solid #e0e0e0;font-size:14px;color:#111"`;

  let sent = 0;
  let adminAlerts = 0;
  for (const appt of appointments) {
    const client = appt.clients as unknown as { full_name: string; email: string | null } | null;
    const meetingLink = (appt as unknown as { meeting_link: string | null }).meeting_link;

    // Online session without a meeting link → alert admin, skip client email
    if (appt.is_online && !meetingLink) {
      if (ADMIN_EMAIL) {
        const clientName = client?.full_name ?? "（未知個案）";
        const scheduledAtAdmin = appt.scheduled_at
          ? new Date(appt.scheduled_at).toLocaleString("zh-TW", {
              year: "numeric", month: "long", day: "numeric",
              weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Macau",
            })
          : "（待確認）";
        await resend.emails.send({
          from: FROM,
          to: ADMIN_EMAIL,
          subject: "【樹心理工作室】⚠ 線上晤談尚未設定視訊連結",
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111;line-height:1.75;font-size:14px">
              <div style="background:#92400e;padding:24px 32px 20px">
                <p style="margin:0 0 4px;color:#fde68a;font-size:11px;letter-spacing:1.5px">TREE COUNSELING STUDIO</p>
                <p style="margin:0;color:#fff;font-size:18px;font-weight:600">⚠ 線上晤談缺少視訊連結</p>
              </div>
              <div style="background:#fff;padding:28px 32px">
                <p style="margin:0 0 20px;color:#444">以下明日的線上晤談尚未設定視訊連結，<strong>提醒信尚未寄出</strong>，請手動處理並通知個案。</p>
                <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
                  <tr><td ${tdL}>個案</td><td ${tdR}><strong>${clientName}</strong></td></tr>
                  <tr><td ${tdL}>晤談時間</td><td ${tdR}>${scheduledAtAdmin}</td></tr>
                  <tr><td ${tdL}>晤談方式</td><td ${tdR}>線上晤談（視訊）</td></tr>
                </table>
              </div>
              <div style="background:#f7f5ef;padding:14px 32px;text-align:center">
                <p style="margin:0;color:#999;font-size:11px">樹心理工作室　Tree Counseling Studio</p>
              </div>
            </div>
          `,
        }).catch(console.error);
        adminAlerts++;
      }
      continue;
    }

    if (!client?.email) continue;

    const therapistProf = appt.therapist_profiles as unknown as { name?: string; title?: string } | null;
    const therapistName = therapistProf?.name;
    const therapistTitle = therapistProf?.title ?? "心理輔導師";
    const scheduledAt = appt.scheduled_at
      ? new Date(appt.scheduled_at).toLocaleString("zh-TW", {
          year: "numeric", month: "long", day: "numeric",
          weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Macau",
        })
      : "（待確認）";

    await resend.emails.send({
      from: FROM,
      to: client.email,
      subject: "【樹心理工作室】明日晤談提醒",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111;line-height:1.75;font-size:14px">
          <div style="background:#2d4a38;padding:24px 32px 20px">
            <p style="margin:0 0 4px;color:#a8c5b0;font-size:11px;letter-spacing:1.5px">TREE COUNSELING STUDIO</p>
            <p style="margin:0;color:#fff;font-size:18px;font-weight:600">明日晤談提醒</p>
          </div>
          <div style="background:#fff;padding:28px 32px">
            <p style="margin:0 0 12px">您好，<strong>${client.full_name}</strong>，</p>
            <p style="margin:0 0 20px;color:#444">提醒您，明天您有以下諮商晤談安排：</p>
            <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
              <tr><td ${tdL}>晤談時間</td><td ${tdR}><strong>${scheduledAt}</strong></td></tr>
              ${therapistName ? `<tr><td ${tdL}>晤談人員</td><td ${tdR}>${therapistName} ${therapistTitle}</td></tr>` : ""}
              <tr><td ${tdL}>晤談方式</td><td ${tdR}>${appt.is_online ? "線上晤談（視訊）" : "面談"}</td></tr>
              ${appt.is_online && meetingLink ? `<tr><td ${tdL}>視訊連結</td><td ${tdR}><a href="${meetingLink}" style="color:#2d4a38;word-break:break-all">${meetingLink}</a></td></tr>` : ""}
            </table>
            <div style="background:#f0f5f1;border-left:3px solid #5a8a6a;padding:14px 18px;margin:0 0 20px">
              <p style="margin:0;color:#2d4a38;font-size:13px;line-height:1.7">如需取消或更改，請盡快透過 WhatsApp 聯繫行政人員，謝謝。</p>
            </div>
            <p><a href="${WHATSAPP_LINK}" style="display:inline-block;background:#25d366;color:#fff;padding:10px 22px;text-decoration:none;font-size:13px;font-weight:600">WhatsApp 聯繫我們 →</a></p>
          </div>
          <div style="background:#f7f5ef;padding:14px 32px;text-align:center">
            <p style="margin:0;color:#999;font-size:11px">樹心理工作室　Tree Counseling Studio</p>
          </div>
        </div>
      `,
    }).catch(console.error);
    sent++;
  }

  return NextResponse.json({ sent, adminAlerts, total: appointments.length });
}
