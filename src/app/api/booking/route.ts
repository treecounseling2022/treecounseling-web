import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@treecounseling.com";
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;

const SERVICE_LABEL: Record<string, string> = {
  individual: "個人心理輔導",
  couple: "伴侶心理輔導",
  hoarding: "囤積者諮商查詢",
  workshop: "講座 / 工作坊",
  proposal: "方案與計劃撰寫",
  other: "其他行政查詢",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.serviceType) {
      return NextResponse.json({ error: "缺少服務類型" }, { status: 400 });
    }

    const db = createAdminClient();

    const { error } = await db.from("booking_inquiries").insert({
      service_type: body.serviceType,
      name: body.name ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      preferred_times: body.preferredTimes ?? null,
      concern: body.concern ?? null,
      form_data: body,
    });

    if (error) {
      console.error("Booking insert error:", error);
      return NextResponse.json({ error: "提交失敗，請稍後再試" }, { status: 500 });
    }

    // Send emails only if Resend is configured
    if (process.env.RESEND_API_KEY) {
      const serviceLabel = SERVICE_LABEL[body.serviceType] ?? body.serviceType;
      const name = body.name ?? "（未填）";
      const clientEmail = body.email ?? null;
      const phone = body.phone ?? "（未填）";
      const concern = body.concern ?? "（未填）";
      const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://treecounseling-web.vercel.app"}/admin/inquiries`;

      // 1. Notify admin
      if (ADMIN_EMAIL) {
        await resend.emails.send({
          from: FROM,
          to: ADMIN_EMAIL,
          subject: `【新預約申請】${name} — ${serviceLabel}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#333;line-height:1.7">
              <h2 style="color:#2d4a38;border-bottom:2px solid #e8e4dc;padding-bottom:8px">新預約申請通知</h2>
              <table style="width:100%;font-size:0.9rem;border-collapse:collapse">
                <tr><td style="color:#888;padding:4px 12px 4px 0;width:100px">姓名</td><td><strong>${name}</strong></td></tr>
                <tr><td style="color:#888;padding:4px 12px 4px 0">服務類型</td><td>${serviceLabel}</td></tr>
                <tr><td style="color:#888;padding:4px 12px 4px 0">電郵</td><td>${clientEmail ?? "—"}</td></tr>
                <tr><td style="color:#888;padding:4px 12px 4px 0">電話</td><td>${phone}</td></tr>
                <tr><td style="color:#888;padding:4px 12px 4px 0">偏好時段</td><td>${body.preferredTimes ?? "—"}</td></tr>
              </table>
              ${concern ? `<div style="margin-top:16px;background:#f7f5ef;padding:12px 16px;border-left:3px solid #5a8a6a;font-size:0.85rem;white-space:pre-wrap">${concern}</div>` : ""}
              <p style="margin-top:20px">
                <a href="${adminUrl}" style="display:inline-block;padding:10px 20px;background:#2d4a38;color:#fff;text-decoration:none;font-size:0.9rem">在後台查看詳情 →</a>
              </p>
              <p style="color:#bbb;font-size:0.75rem;margin-top:32px;border-top:1px solid #eee;padding-top:8px">樹心理工作室後台通知</p>
            </div>
          `,
        }).catch(console.error);
      }

      // 2. Confirmation to client(s)
      // For couple counseling, send to both partners
      const coupleDetails = body.coupleDetails as { partnerA?: { name?: string; email?: string }; partnerB?: { name?: string; email?: string } } | undefined;
      const clientRecipients: { email: string; name: string }[] = [];

      if (body.serviceType === "couple" && coupleDetails) {
        const emailA = coupleDetails.partnerA?.email;
        const emailB = coupleDetails.partnerB?.email;
        const nameA = coupleDetails.partnerA?.name ?? "A";
        const nameB = coupleDetails.partnerB?.name ?? "B";
        if (emailA) clientRecipients.push({ email: emailA, name: nameA });
        if (emailB) clientRecipients.push({ email: emailB, name: nameB });
      } else if (clientEmail) {
        clientRecipients.push({ email: clientEmail, name });
      }

      const confirmHtml = (recipientName: string) => `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#333;line-height:1.7">
          <h2 style="color:#2d4a38">預約申請已收到</h2>
          <p>您好，${recipientName}，</p>
          <p>我們已收到您的 <strong>${serviceLabel}</strong> 預約申請，感謝您的信任。</p>
          <p>行政人員將在 <strong>兩個工作天內</strong> 以 WhatsApp 或 Email 與您聯絡，確認後續晤談安排。</p>
          <p>如有緊急需求，歡迎直接聯繫我們：</p>
          <ul style="font-size:0.9rem;color:#555">
            <li>WhatsApp：請至官網查看最新聯絡資訊</li>
            <li>Email：<a href="mailto:${FROM}" style="color:#2d4a38">${FROM}</a></li>
          </ul>
          <p style="color:#888;font-size:0.85rem;margin-top:24px">— 樹心理工作室 Tree Counseling Studio</p>
        </div>
      `;

      for (const recipient of clientRecipients) {
        await resend.emails.send({
          from: FROM,
          to: recipient.email,
          subject: "【樹心理工作室】已收到您的預約申請",
          html: confirmHtml(recipient.name),
        }).catch(console.error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Booking API error:", err);
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}
