import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";
import { checkTimeConflict } from "@/lib/appointments";
import { Resend } from "resend";
import { generateInquiryPDF } from "@/lib/pdf/inquiry-pdf";
import { escapeHtml } from "@/lib/utils";

const resend = new Resend(process.env.RESEND_API_KEY);

const SERVICE_LABEL: Record<string, string> = {
  individual: "個人心理輔導",
  couple: "伴侶心理輔導",
  hoarding: "囤積者諮商查詢",
  workshop: "講座 / 工作坊",
  proposal: "方案與計劃撰寫",
  other: "其他行政查詢",
};

const MEETING_LABEL: Record<string, string> = {
  face: "到診",
  online: "線上晤談",
};

const LANG_LABEL: Record<string, string> = {
  cantonese: "粵語",
  mandarin: "普通話",
  english: "英語",
};

function extractClientName(inquiry: { name?: string | null; service_type?: string; form_data?: unknown }): string {
  if (inquiry.name) return inquiry.name;
  const fd = (inquiry.form_data ?? {}) as Record<string, unknown>;
  if (typeof fd.name === "string" && fd.name) return fd.name;
  if (inquiry.service_type === "couple") {
    const cd = fd.coupleDetails as { partnerA?: { name?: string }; partnerB?: { name?: string } } | undefined;
    const a = cd?.partnerA?.name;
    const b = cd?.partnerB?.name;
    if (a || b) return [a, b].filter(Boolean).join(" & ");
  }
  return "未知";
}

function calcAge(dob: string): number | null {
  try {
    const today = new Date();
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

function fmtBirthday(dob: string): string {
  const age = calcAge(dob);
  return age !== null ? `${dob}（${age} 歲）` : dob;
}

const TD_LABEL = `style="color:#555;padding:6px 16px 6px 0;border-bottom:1px solid #eee;white-space:nowrap;vertical-align:top;font-size:0.88rem"`;
const TD_VALUE = `style="padding:6px 0;border-bottom:1px solid #eee;font-size:0.9rem;color:#111"`;

function row(label: string, value: string): string {
  return `<tr><td ${TD_LABEL}>${label}</td><td ${TD_VALUE}>${value}</td></tr>`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as {
    therapist_id: string;
    room_id?: string;
    scheduled_at?: string;
    session_fee?: number;
    plan_id?: string;
    is_online?: boolean;
  };

  if (!body.therapist_id) {
    return NextResponse.json({ error: "請選擇心理師" }, { status: 400 });
  }

  const db = createAdminClient();

  // Fetch the inquiry
  const { data: inquiry, error: fetchErr } = await db
    .from("booking_inquiries")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !inquiry) {
    return NextResponse.json({ error: "找不到申請記錄" }, { status: 404 });
  }
  if (inquiry.status === "converted") {
    return NextResponse.json({ error: "此申請已派案" }, { status: 409 });
  }

  // Upsert client（同時比對 email 與 phone，避免同一人換過聯絡方式就建重複個案）
  let clientId: string | null = null;
  let createdNewClient = false;
  {
    const [byEmail, byPhone] = await Promise.all([
      inquiry.email
        ? db.from("clients").select("id, full_name").eq("email", inquiry.email).maybeSingle()
        : Promise.resolve({ data: null }),
      inquiry.phone
        ? db.from("clients").select("id, full_name").eq("phone", inquiry.phone).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const existing = byEmail.data ?? byPhone.data;
    if (existing) {
      clientId = existing.id;
      // 只在既有個案尚未有姓名時才帶入申請表姓名，避免覆蓋既有正確資料
      const newName = extractClientName(inquiry);
      if (!existing.full_name && newName && newName !== "未知") {
        await db.from("clients").update({ full_name: newName }).eq("id", existing.id);
      }
    }
  }

  if (!clientId) {
    const formData = (inquiry.form_data as Record<string, unknown>) ?? {};
    const GENDER_MAP: Record<string, string> = { "男": "male", "女": "female", "其他": "other" };
    const rawGender = formData.gender as string | undefined;
    const clientName = extractClientName(inquiry);

    const { data: newClient, error: clientErr } = await db
      .from("clients")
      .insert({
        full_name: clientName,
        email: inquiry.email ?? null,
        phone: inquiry.phone ?? null,
        dob: (formData.birthday as string) || null,
        gender: rawGender ? (GENDER_MAP[rawGender] ?? null) : null,
        intake_notes: inquiry.concern ?? null,
        is_active: true,
      })
      .select("id")
      .single();
    if (clientErr || !newClient) {
      return NextResponse.json({ error: `建立個案失敗：${clientErr?.message}` }, { status: 500 });
    }
    clientId = newClient.id;
    createdNewClient = true;
  }

  // Conflict check when a time slot has already been chosen
  if (body.scheduled_at) {
    const conflict = await checkTimeConflict(db, body.therapist_id, body.scheduled_at);
    if (conflict) {
      return NextResponse.json({ error: conflict }, { status: 409 });
    }
  }

  // Auto-detect intake: first ever appointment for this client
  const { count: existingApptCount } = await db
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .neq("booking_status", "cancelled");
  const sessionType = (existingApptCount ?? 0) === 0 ? "intake" : "followup";

  // Create appointment in pending_therapist state
  const { data: appt, error: apptErr } = await db
    .from("appointments")
    .insert({
      client_id: clientId,
      therapist_id: body.therapist_id,
      room_id: body.room_id ?? null,
      scheduled_at: body.scheduled_at ?? null,
      session_fee: body.session_fee ?? null,
      plan_id: body.plan_id ?? null,
      is_online: body.is_online ?? false,
      booking_status: "pending_therapist",
      session_type: sessionType,
    })
    .select()
    .single();
  if (apptErr) {
    // 若這次請求才剛建立新個案，預約卻建立失敗，清除避免留下孤兒個案
    if (createdNewClient) {
      await db.from("clients").delete().eq("id", clientId);
    }
    return NextResponse.json({ error: `建立預約失敗：${apptErr.message}` }, { status: 500 });
  }

  // Mark inquiry as converted and store created client/appointment links
  await db
    .from("booking_inquiries")
    .update({ status: "converted", client_id: clientId, appointment_id: appt.id })
    .eq("id", id);

  // Sync assigned_therapist_id so therapist can see the client immediately
  await db
    .from("clients")
    .update({ assigned_therapist_id: body.therapist_id })
    .eq("id", clientId);

  // Send email notification to therapist
  if (process.env.RESEND_API_KEY) {
    const { data: therapistProfile } = await db
      .from("therapist_profiles")
      .select("name, email")
      .eq("id", body.therapist_id)
      .single();
    if (therapistProfile?.email) {
      const clientName = extractClientName(inquiry);
      const serviceLabel = SERVICE_LABEL[inquiry.service_type] ?? inquiry.service_type;
      const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://treecounseling.com"}/admin/appointments`;

      // Extract extra fields from form_data
      const fd = (inquiry.form_data ?? {}) as Record<string, unknown>;
      const isCouple = inquiry.service_type === "couple";
      const cd = isCouple
        ? (fd.coupleDetails as { partnerA?: { name?: string; birthday?: string; language?: string }; partnerB?: { name?: string; birthday?: string; language?: string }; meetingType?: string } | undefined)
        : undefined;
      const meetingType = (cd?.meetingType ?? fd.meetingType) as string | undefined;
      const birthday = fd.birthday as string | undefined;
      const nativeLanguage = fd.nativeLanguage as string | undefined;
      const concern = inquiry.concern;

      // Build table rows
      const tableRows: string[] = [];
      tableRows.push(row("個案", `<strong>${escapeHtml(clientName)}</strong>`));
      tableRows.push(row("服務類型", serviceLabel));

      // Birthday with age (individual/hoarding)
      if (!isCouple && birthday) {
        tableRows.push(row("出生日期", fmtBirthday(birthday)));
      }
      // For couple, show both partners' birthdays
      if (isCouple && cd) {
        if (cd.partnerA?.birthday) tableRows.push(row("伴侶 A 出生日期", fmtBirthday(cd.partnerA.birthday)));
        if (cd.partnerB?.birthday) tableRows.push(row("伴侶 B 出生日期", fmtBirthday(cd.partnerB.birthday)));
      }

      // Mother tongue
      if (nativeLanguage) {
        tableRows.push(row("語言", LANG_LABEL[nativeLanguage] ?? escapeHtml(nativeLanguage)));
      }

      // Meeting type — only show if NOT 到診 (face-to-face)
      if (meetingType && meetingType !== "face") {
        tableRows.push(row("晤談方式", MEETING_LABEL[meetingType] ?? escapeHtml(meetingType)));
      }

      // Preferred times
      if (inquiry.preferred_times) {
        tableRows.push(row("偏好時段", `<span style="font-size:0.85rem">${escapeHtml(inquiry.preferred_times)}</span>`));
      }

      // Scheduled time (if already set)
      if (body.scheduled_at) {
        const scheduledStr = new Date(body.scheduled_at).toLocaleString("zh-TW", {
          year: "numeric", month: "long", day: "numeric",
          hour: "2-digit", minute: "2-digit", timeZone: "Asia/Macau",
        });
        tableRows.push(row("預計時間", scheduledStr));
      }

      // Generate PDF attachment (same as admin notification)
      let pdfAttachment: { filename: string; content: string } | undefined;
      try {
        const pdfBuffer = await generateInquiryPDF({
          serviceType: inquiry.service_type,
          preferredTimes: inquiry.preferred_times ?? undefined,
          name: (fd.name as string) ?? inquiry.name ?? undefined,
          gender: fd.gender as string | undefined,
          birthday: fd.birthday as string | undefined,
          city: fd.city as string | undefined,
          meetingType: fd.meetingType as string | undefined,
          nativeLanguage: fd.nativeLanguage as string | undefined,
          preferredTherapist: fd.preferredTherapist as string | undefined,
          concern: inquiry.concern ?? undefined,
          individualDetails: fd.individualDetails as Parameters<typeof generateInquiryPDF>[0]["individualDetails"],
          coupleDetails: cd
            ? {
                partnerA: {
                  name: cd.partnerA?.name ?? undefined,
                  gender: (cd.partnerA as Record<string, unknown>)?.gender as string | undefined,
                  birthday: cd.partnerA?.birthday ?? undefined,
                  language: cd.partnerA?.language ?? undefined,
                },
                partnerB: {
                  name: cd.partnerB?.name ?? undefined,
                  gender: (cd.partnerB as Record<string, unknown>)?.gender as string | undefined,
                  birthday: cd.partnerB?.birthday ?? undefined,
                  language: cd.partnerB?.language ?? undefined,
                },
                issues: (fd.coupleDetails as Record<string, unknown>)?.issues as string[] | undefined,
                duration: (fd.coupleDetails as Record<string, unknown>)?.duration as string | undefined,
                children: (fd.coupleDetails as Record<string, unknown>)?.children as string | undefined,
                meetingType: cd.meetingType ?? undefined,
              }
            : undefined,
          otherDetails: fd.otherDetails as Parameters<typeof generateInquiryPDF>[0]["otherDetails"],
          submittedAt: inquiry.created_at ?? new Date().toISOString(),
        });
        const dateStr = new Date().toISOString().slice(0, 10);
        pdfAttachment = {
          filename: `booking_inquiry_${dateStr}.pdf`,
          content: pdfBuffer.toString("base64"),
        };
      } catch (pdfErr) {
        console.error("Therapist PDF generation failed:", pdfErr);
      }

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@treecounseling.com",
        to: therapistProfile.email,
        subject: "【樹心理工作室】新派案通知",
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;color:#111;line-height:1.7">
            <h2 style="font-size:1.1rem;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:16px">新派案通知</h2>
            <p style="margin:0 0 4px">您好，${therapistProfile.name ?? ""}，</p>
            <p style="margin:0 0 16px;color:#444">行政已為您安排一個新個案，請登入後台確認是否接案。詳細資料請見附件 PDF。</p>
            <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
              ${tableRows.join("\n")}
            </table>
            ${concern ? `<div style="border-left:3px solid #ccc;padding:10px 14px;margin:0 0 20px;font-size:0.88rem;color:#333;line-height:1.65"><strong>個案說明：</strong><br>${escapeHtml(concern).replace(/\n/g, "<br>")}</div>` : ""}
            <p><a href="${adminUrl}" style="color:#111;font-weight:bold;text-decoration:underline">前往後台確認 →</a></p>
            <p style="color:#888;font-size:0.8rem;margin-top:24px;border-top:1px solid #eee;padding-top:10px">樹心理工作室　Tree Counseling Studio</p>
          </div>
        `,
        attachments: pdfAttachment ? [pdfAttachment] : [],
      }).catch(console.error);
    }
  }

  return NextResponse.json({ success: true, appointment_id: appt.id, client_id: clientId }, { status: 201 });
}
