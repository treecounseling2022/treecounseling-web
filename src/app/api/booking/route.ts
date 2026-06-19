import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { generateInquiryPDF } from "@/lib/pdf/inquiry-pdf";
import { uploadPDFToDrive } from "@/lib/google-drive";

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
      const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://treecounseling-web.vercel.app"}/admin/inquiries`;

      // 1. Notify admin — no contact info in body; full details in PDF attachment
      if (ADMIN_EMAIL) {
        // Generate PDF (all form data except contact info)
        let pdfAttachment: { filename: string; content: string } | undefined;
        try {
          const coupleDetails = body.coupleDetails as {
            partnerA?: { name?: string; gender?: string; birthday?: string; language?: string };
            partnerB?: { name?: string; gender?: string; birthday?: string; language?: string };
            issues?: string[];
            duration?: string;
            children?: string;
            meetingType?: string;
          } | undefined;

          const otherDetails = body.otherDetails as {
            companyName?: string;
            contactPerson?: string;
            theme?: string;
          } | undefined;

          const pdfBuffer = await generateInquiryPDF({
            serviceType: body.serviceType,
            preferredTimes: body.preferredTimes ?? undefined,
            name: body.name ?? undefined,
            gender: body.gender ?? undefined,
            birthday: body.birthday ?? undefined,
            city: body.city ?? undefined,
            meetingType: body.meetingType ?? undefined,
            nativeLanguage: body.nativeLanguage ?? undefined,
            preferredTherapist: body.preferredTherapist ?? undefined,
            concern: body.concern ?? undefined,
            individualDetails: body.individualDetails ?? undefined,
            coupleDetails: coupleDetails
              ? {
                  partnerA: {
                    name: coupleDetails.partnerA?.name,
                    gender: coupleDetails.partnerA?.gender,
                    birthday: coupleDetails.partnerA?.birthday,
                    language: coupleDetails.partnerA?.language,
                  },
                  partnerB: {
                    name: coupleDetails.partnerB?.name,
                    gender: coupleDetails.partnerB?.gender,
                    birthday: coupleDetails.partnerB?.birthday,
                    language: coupleDetails.partnerB?.language,
                  },
                  issues: coupleDetails.issues,
                  duration: coupleDetails.duration,
                  children: coupleDetails.children,
                  meetingType: coupleDetails.meetingType,
                }
              : undefined,
            otherDetails,
            submittedAt: new Date().toISOString(),
          });

          const dateStr = new Date().toISOString().slice(0, 10);
          const pdfFileName = `${dateStr}_${(body.name ?? "未知").replace(/[/\\?%*:|"<>]/g, "_")}_預約查詢.pdf`;
          pdfAttachment = {
            filename: pdfFileName,
            content: pdfBuffer.toString("base64"),
          };

          // 上傳至 Google Drive（背景執行，不阻擋 email 發送）
          if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
            uploadPDFToDrive(
              pdfBuffer,
              pdfFileName,
              process.env.GOOGLE_DRIVE_FOLDER_ID ?? undefined,
              body.name ?? "未知申請人"
            ).catch((e) => console.error("Drive upload failed:", e));
          }
        } catch (pdfErr) {
          console.error("PDF generation failed:", pdfErr);
        }

        const tdL = `style="color:#555;padding:6px 16px 6px 0;border-bottom:1px solid #eee;white-space:nowrap;font-size:0.88rem"`;
        const tdR = `style="padding:6px 0;border-bottom:1px solid #eee;font-size:0.9rem;color:#111"`;
        await resend.emails
          .send({
            from: FROM,
            to: ADMIN_EMAIL,
            subject: `【新預約申請】${name} — ${serviceLabel}`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111;line-height:1.7">
                <h2 style="font-size:1.1rem;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:16px">新預約申請通知</h2>
                <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
                  <tr><td ${tdL}>申請人</td><td ${tdR}><strong>${name}</strong></td></tr>
                  <tr><td ${tdL}>服務類型</td><td ${tdR}>${serviceLabel}</td></tr>
                  ${body.preferredTimes ? `<tr><td ${tdL} style="color:#555;padding:6px 16px 6px 0;border-bottom:1px solid #eee;white-space:nowrap;vertical-align:top;font-size:0.88rem">偏好時段</td><td ${tdR}><span style="font-size:0.85rem">${body.preferredTimes}</span></td></tr>` : ""}
                </table>
                <p style="color:#555;font-size:0.85rem">完整申請資料（不含聯絡方式）請見附件 PDF。如需聯絡申請人，請至後台查閱聯絡方式。</p>
                <p><a href="${adminUrl}" style="color:#111;font-weight:bold;text-decoration:underline">前往後台查看申請 →</a></p>
                <p style="color:#888;font-size:0.8rem;margin-top:24px;border-top:1px solid #eee;padding-top:10px">樹心理工作室　Tree Counseling Studio</p>
              </div>
            `,
            attachments: pdfAttachment ? [pdfAttachment] : [],
          })
          .catch(console.error);
      }

      // 2. Confirmation to client(s)
      // For couple counseling, send to both partners (A and B each receive their own confirmation)
      const coupleDetails = body.coupleDetails as {
        partnerA?: { name?: string; email?: string };
        partnerB?: { name?: string; email?: string };
      } | undefined;

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
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f7f5ef;border-radius:8px;overflow:hidden">
          <!-- Header -->
          <div style="background:#2d4a38;padding:28px 36px 24px">
            <p style="margin:0 0 4px;color:#a8c5b0;font-size:11px;letter-spacing:1.5px">TREE COUNSELING STUDIO</p>
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:600;letter-spacing:0.3px">預約申請已收到</p>
          </div>
          <!-- Body -->
          <div style="background:#ffffff;padding:28px 36px">
            <p style="margin:0 0 14px;color:#2d4a38;font-size:15px;font-weight:600">您好，${recipientName}，</p>
            <p style="margin:0 0 14px;color:#555;line-height:1.75">感謝您信任樹心理工作室。我們已收到您的 <strong style="color:#2d4a38">${serviceLabel}</strong> 預約申請。</p>
            <!-- Highlight box -->
            <div style="background:#f0f5f1;border-left:3px solid #5a8a6a;padding:14px 18px;margin:0 0 18px;border-radius:0 4px 4px 0">
              <p style="margin:0;color:#2d4a38;font-size:13.5px;line-height:1.7">行政人員將在 <strong>兩個工作天內</strong> 以 WhatsApp 或 Email 與您聯絡，確認後續晤談安排。</p>
            </div>
            <p style="margin:0 0 6px;color:#777;font-size:13px">如有緊急需求，歡迎直接聯繫我們：</p>
            <ul style="margin:0 0 0;padding-left:18px;color:#555;font-size:13px;line-height:2">
              <li>WhatsApp：請至官網查看最新聯絡資訊</li>
              <li>Email：<a href="mailto:${FROM}" style="color:#2d4a38;text-decoration:none;font-weight:500">${FROM}</a></li>
            </ul>
          </div>
          <!-- Footer -->
          <div style="background:#f7f5ef;padding:16px 36px;text-align:center">
            <p style="margin:0;color:#999;font-size:11px;letter-spacing:0.5px">樹心理工作室　Tree Counseling Studio</p>
          </div>
        </div>
      `;

      await Promise.allSettled(
        clientRecipients.map((recipient) =>
          resend.emails.send({
            from: FROM,
            to: recipient.email,
            subject: "【樹心理工作室】已收到您的預約申請",
            html: confirmHtml(recipient.name),
          })
        )
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Booking API error:", err);
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}
