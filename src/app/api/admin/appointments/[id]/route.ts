import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";
import { checkTimeConflict } from "@/lib/appointments";
import { generateInquiryPDF } from "@/lib/pdf/inquiry-pdf";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, maskClientName } from "@/lib/google-calendar";
import { getTherapistDisplayName } from "@/lib/utils";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type Action = "assign" | "confirm" | "reject" | "lock" | "cancel" | "complete" | "reschedule";

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
      meeting_link: (body.meeting_link as string | null | undefined) ?? null,
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
  } else if (action === "reschedule") {
    // Admin reschedules an existing confirmed/locked appointment
    if (!isAdminLevel(auth.role)) return NextResponse.json({ error: "未授權" }, { status: 403 });
    if (!body.scheduled_at) return NextResponse.json({ error: "請選擇新時間" }, { status: 400 });
    if (appt.therapist_id) {
      const conflict = await checkTimeConflict(
        db,
        appt.therapist_id,
        body.scheduled_at as string,
        (body.duration_minutes as number | undefined) ?? appt.duration_minutes ?? 50,
        id,
      );
      if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });
    }
    update = {
      scheduled_at: body.scheduled_at,
      ...(body.room_id !== undefined ? { room_id: body.room_id || null } : {}),
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

  // After rejection: clear assigned_therapist_id if no other confirmed/locked appointments exist
  if (action === "reject" && appt.client_id && appt.therapist_id) {
    const { count } = await db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("client_id", appt.client_id)
      .eq("therapist_id", appt.therapist_id)
      .in("booking_status", ["confirmed", "locked"])
      .neq("id", id);
    if ((count ?? 0) === 0) {
      await db
        .from("clients")
        .update({ assigned_therapist_id: null })
        .eq("id", appt.client_id)
        .eq("assigned_therapist_id", appt.therapist_id);
    }
  }

  // ── Google Calendar 同步（await 確保 Vercel Lambda 不會提前終止）────────────
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const SPACE_CAL_ID = process.env.GOOGLE_SPACE_CALENDAR_ID;

    console.log("[Calendar] confirm check — scheduled_at:", data?.scheduled_at, "| therapist_id:", data?.therapist_id, "| client_id:", data?.client_id, "| SPACE_CAL_ID set:", !!SPACE_CAL_ID);
    if (action === "confirm" && data?.scheduled_at && data.therapist_id && data.client_id) {
      try {
        const [{ data: clientRow }, { data: therapistRow }] = await Promise.all([
          db.from("clients").select("full_name").eq("id", data.client_id).single(),
          db.from("therapist_profiles").select("name, google_calendar_id").eq("id", data.therapist_id).single(),
        ]);
        console.log("[Calendar] therapistRow?.google_calendar_id:", therapistRow?.google_calendar_id, "| is_online:", !!(data as Record<string, unknown>).is_online);

        const duration = (data as Record<string, unknown>).duration_minutes as number ?? 50;
        const isOnline = !!(data as Record<string, unknown>).is_online;

        const { count: sessionCount } = await db
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("client_id", data.client_id)
          .in("booking_status", ["confirmed", "locked", "completed"])
          .lte("scheduled_at", data.scheduled_at);
        const sessionNumber = sessionCount ?? 1;

        const maskedName = maskClientName(clientRow?.full_name ?? "個案");
        const therapistFirstName = getTherapistDisplayName(therapistRow?.name ?? "");
        const therapistCalId = therapistRow?.google_calendar_id;
        const therapistSummary = isOnline
          ? `${maskedName}-${sessionNumber}-Online`
          : `${maskedName}-${sessionNumber}`;

        let therapistEventId: string | null = null;
        if (therapistCalId) {
          therapistEventId = await createCalendarEvent(therapistCalId, {
            summary: therapistSummary,
            startIso: data.scheduled_at,
            durationMinutes: duration,
          });
        }

        let spaceEventId: string | null = null;
        if (!isOnline && SPACE_CAL_ID) {
          spaceEventId = await createCalendarEvent(SPACE_CAL_ID, {
            summary: therapistFirstName,
            startIso: data.scheduled_at,
            durationMinutes: duration,
          });
        }

        if (therapistEventId || spaceEventId) {
          await db.from("appointments").update({
            ...(therapistEventId ? { therapist_calendar_event_id: therapistEventId } : {}),
            ...(spaceEventId ? { space_calendar_event_id: spaceEventId } : {}),
          }).eq("id", id);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const details = (err as Record<string, unknown>)?.response as Record<string, unknown> | undefined;
        console.error("[Calendar] sync (confirm) FAILED:", msg, details ? JSON.stringify(details.data ?? details.status) : "");
      }
    }

    if (action === "reschedule" && data?.scheduled_at) {
      try {
        const duration = (appt as Record<string, unknown>).duration_minutes as number ?? 50;
        const isOnline = !!(appt as Record<string, unknown>).is_online;
        const apptAny = appt as Record<string, unknown>;
        const therapistCalEventId = apptAny.therapist_calendar_event_id as string | null;
        const spaceCalEventId = apptAny.space_calendar_event_id as string | null;

        const [{ data: clientRow }, { data: therapistRow }] = await Promise.all([
          appt.client_id
            ? db.from("clients").select("full_name").eq("id", appt.client_id).single()
            : Promise.resolve({ data: null }),
          appt.therapist_id
            ? db.from("therapist_profiles").select("name, google_calendar_id").eq("id", appt.therapist_id).single()
            : Promise.resolve({ data: null }),
        ]);

        const { count: sessionCount } = await db
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("client_id", appt.client_id!)
          .in("booking_status", ["confirmed", "locked", "completed"])
          .lte("scheduled_at", data.scheduled_at);
        const sessionNumber = sessionCount ?? 1;

        const maskedName = maskClientName(clientRow?.full_name ?? "個案");
        const therapistFirstName = getTherapistDisplayName(therapistRow?.name ?? "");
        const therapistSummary = isOnline
          ? `${maskedName}-${sessionNumber}-Online`
          : `${maskedName}-${sessionNumber}`;

        const therapistCalId = therapistRow?.google_calendar_id;
        if (therapistCalEventId && therapistCalId) {
          await updateCalendarEvent(therapistCalId, therapistCalEventId, {
            summary: therapistSummary,
            startIso: data.scheduled_at,
            durationMinutes: duration,
          });
        }
        if (spaceCalEventId && !isOnline && SPACE_CAL_ID) {
          await updateCalendarEvent(SPACE_CAL_ID, spaceCalEventId, {
            summary: therapistFirstName,
            startIso: data.scheduled_at,
            durationMinutes: duration,
          });
        }
      } catch (err) {
        console.error("Calendar sync (reschedule) failed:", err);
      }
    }

    if (action === "cancel") {
      try {
        const apptAny = appt as Record<string, unknown>;
        const therapistCalEventId = apptAny.therapist_calendar_event_id as string | null;
        const spaceCalEventId = apptAny.space_calendar_event_id as string | null;

        const therapistCalId = appt.therapist_id
          ? (await db.from("therapist_profiles").select("google_calendar_id").eq("id", appt.therapist_id).single()).data?.google_calendar_id
          : null;

        if (therapistCalEventId && therapistCalId) {
          await deleteCalendarEvent(therapistCalId, therapistCalEventId).catch(console.error);
        }
        if (spaceCalEventId && SPACE_CAL_ID) {
          await deleteCalendarEvent(SPACE_CAL_ID, spaceCalEventId).catch(console.error);
        }
      } catch (err) {
        console.error("Calendar sync (cancel) failed:", err);
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@treecounseling.com";
  const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://treecounseling.com";
  const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;
  const WHATSAPP_LINK = "https://wa.me/85362772234";

  const tdL = `style="color:#333;padding:8px 18px 8px 0;border-bottom:1px solid #e0e0e0;white-space:nowrap;font-size:14px;font-weight:600"`;
  const tdR = `style="padding:8px 0;border-bottom:1px solid #e0e0e0;font-size:14px;color:#111"`;

  // After admin assigns, send email to therapist (with inquiry PDF)
  if (action === "assign" && data?.therapist_id && process.env.RESEND_API_KEY) {
    const [{ data: therapistProfile }, { data: clientData }] = await Promise.all([
      db.from("therapist_profiles").select("name, email").eq("id", data.therapist_id).single(),
      data.client_id
        ? db.from("clients").select("full_name").eq("id", data.client_id).single()
        : Promise.resolve({ data: null }),
    ]);
    if (therapistProfile?.email) {
      const adminUrl = `${SITE}/admin/appointments`;

      // Generate inquiry PDF to attach
      let assignPdfAttachment: { filename: string; content: Buffer } | undefined;
      const { data: assignInquiry } = await db
        .from("booking_inquiries")
        .select("*")
        .eq("appointment_id", id)
        .maybeSingle();
      if (assignInquiry) {
        try {
          const fd = (assignInquiry.form_data ?? {}) as Record<string, unknown>;
          const isCouple = assignInquiry.service_type === "couple";
          const cd = isCouple
            ? (fd.coupleDetails as {
                partnerA?: { name?: string; gender?: string; birthday?: string; language?: string };
                partnerB?: { name?: string; gender?: string; birthday?: string; language?: string };
                meetingType?: string;
              } | undefined)
            : undefined;
          const pdfBuf = await generateInquiryPDF({
            serviceType: assignInquiry.service_type,
            preferredTimes: assignInquiry.preferred_times ?? undefined,
            name: (fd.name as string) ?? assignInquiry.name ?? undefined,
            gender: fd.gender as string | undefined,
            birthday: fd.birthday as string | undefined,
            city: fd.city as string | undefined,
            meetingType: fd.meetingType as string | undefined,
            nativeLanguage: fd.nativeLanguage as string | undefined,
            preferredTherapist: fd.preferredTherapist as string | undefined,
            concern: assignInquiry.concern ?? undefined,
            individualDetails: fd.individualDetails as Parameters<typeof generateInquiryPDF>[0]["individualDetails"],
            coupleDetails: cd ? {
              partnerA: { name: cd.partnerA?.name, gender: cd.partnerA?.gender, birthday: cd.partnerA?.birthday, language: cd.partnerA?.language },
              partnerB: { name: cd.partnerB?.name, gender: cd.partnerB?.gender, birthday: cd.partnerB?.birthday, language: cd.partnerB?.language },
              issues: (fd.coupleDetails as Record<string, unknown>)?.issues as string[] | undefined,
              duration: (fd.coupleDetails as Record<string, unknown>)?.duration as string | undefined,
              children: (fd.coupleDetails as Record<string, unknown>)?.children as string | undefined,
              meetingType: cd.meetingType ?? undefined,
            } : undefined,
            otherDetails: fd.otherDetails as Parameters<typeof generateInquiryPDF>[0]["otherDetails"],
            submittedAt: assignInquiry.created_at ?? new Date().toISOString(),
          });
          const dateStr = new Date().toISOString().slice(0, 10);
          assignPdfAttachment = { filename: `booking_inquiry_${dateStr}.pdf`, content: pdfBuf };
        } catch (pdfErr) {
          console.error("Assign therapist PDF generation failed:", pdfErr);
        }
      }

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
              <p style="margin:0 0 12px">您好，<strong>${therapistProfile.name ?? ""}心理師</strong>，</p>
              <p style="margin:0 0 20px;color:#444">行政已為您安排一個新個案，個案預約資料請見附件 PDF。請登入後台確認是否接案。</p>
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
        attachments: assignPdfAttachment ? [assignPdfAttachment] : [],
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

  // After therapist confirms: email client + email therapist with PDF
  if (action === "confirm" && data?.client_id && process.env.RESEND_API_KEY) {
    const [{ data: client }, { data: therapistProfile }] = await Promise.all([
      db.from("clients").select("full_name, email, intake_token, intake_submitted_at").eq("id", data.client_id).single(),
      data.therapist_id
        ? db.from("therapist_profiles").select("name, email, title").eq("id", data.therapist_id).single()
        : Promise.resolve({ data: null }),
    ]);

    // ── 心理師：附預約查詢 PDF（與派案通知相同格式，字型可靠）──────────────────
    if (data.therapist_id && therapistProfile) {
      const tProfile = therapistProfile as typeof therapistProfile & { email?: string | null };
      if (tProfile.email) {
        (async () => {
          const scheduledAt = data.scheduled_at
            ? new Date(data.scheduled_at).toLocaleString("zh-TW", {
                year: "numeric", month: "long", day: "numeric",
                weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Macau",
              })
            : "（待另行通知）";

          // 從 booking_inquiries 找回原始申請資料，生成與派案通知相同的 PDF
          const { data: inquiry } = await db
            .from("booking_inquiries")
            .select("*")
            .eq("appointment_id", id)
            .maybeSingle();

          let pdfAttachment: { filename: string; content: Buffer } | undefined;
          if (inquiry) {
            try {
              const fd = (inquiry.form_data ?? {}) as Record<string, unknown>;
              const isCouple = inquiry.service_type === "couple";
              const cd = isCouple
                ? (fd.coupleDetails as {
                    partnerA?: { name?: string; gender?: string; birthday?: string; language?: string };
                    partnerB?: { name?: string; gender?: string; birthday?: string; language?: string };
                    meetingType?: string;
                  } | undefined)
                : undefined;
              const pdfBuf = await generateInquiryPDF({
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
                coupleDetails: cd ? {
                  partnerA: { name: cd.partnerA?.name, gender: cd.partnerA?.gender, birthday: cd.partnerA?.birthday, language: cd.partnerA?.language },
                  partnerB: { name: cd.partnerB?.name, gender: cd.partnerB?.gender, birthday: cd.partnerB?.birthday, language: cd.partnerB?.language },
                  issues: (fd.coupleDetails as Record<string, unknown>)?.issues as string[] | undefined,
                  duration: (fd.coupleDetails as Record<string, unknown>)?.duration as string | undefined,
                  children: (fd.coupleDetails as Record<string, unknown>)?.children as string | undefined,
                  meetingType: cd.meetingType ?? undefined,
                } : undefined,
                otherDetails: fd.otherDetails as Parameters<typeof generateInquiryPDF>[0]["otherDetails"],
                submittedAt: inquiry.created_at ?? new Date().toISOString(),
              });
              const dateStr = new Date().toISOString().slice(0, 10);
              pdfAttachment = { filename: `booking_inquiry_${dateStr}.pdf`, content: pdfBuf };
            } catch (pdfErr) {
              console.error("Confirm therapist PDF generation failed:", pdfErr);
            }
          }

          await resend.emails.send({
            from: FROM,
            to: tProfile.email!,
            subject: `【個案資料】${client?.full_name ?? ""} — 排案確認`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111;font-size:14px;line-height:1.75">
                <div style="background:#2d4a38;padding:20px 28px">
                  <p style="margin:0;color:#a8c5b0;font-size:11px;letter-spacing:1.5px">TREE COUNSELING STUDIO</p>
                  <p style="margin:4px 0 0;color:#fff;font-size:17px;font-weight:600">排案確認 — ${client?.full_name ?? ""}</p>
                </div>
                <div style="background:#fff;padding:24px 28px">
                  <p style="margin:0 0 12px">您好，<strong>${tProfile.name ?? ""}心理師</strong>，</p>
                  <p style="margin:0 0 16px;color:#444">您已確認接案，個案基本資料請見附件 PDF。</p>
                  <p style="margin:0 0 4px;color:#333;font-weight:600">晤談時間</p>
                  <p style="margin:0 0 0;color:#111">${scheduledAt}</p>
                </div>
                <div style="background:#f7f5ef;padding:12px 28px;text-align:center">
                  <p style="margin:0;color:#999;font-size:11px">樹心理工作室　Tree Counseling Studio</p>
                </div>
              </div>
            `,
            attachments: pdfAttachment ? [pdfAttachment] : [],
          });
        })().catch(console.error);
      }
    }

    if (client?.email) {
      const scheduledAt = data.scheduled_at
        ? new Date(data.scheduled_at).toLocaleString("zh-TW", {
            year: "numeric", month: "long", day: "numeric",
            weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Macau",
          })
        : "（待另行通知）";

      // Include intake link if this is the first appointment, intake not yet submitted, and not couple counseling
      const clientAny = client as typeof client & { intake_token?: string | null; intake_submitted_at?: string | null };
      const intakeToken = clientAny.intake_token;
      const intakeSubmitted = !!clientAny.intake_submitted_at;
      const { data: inquiryForIntake } = await db
        .from("booking_inquiries")
        .select("service_type")
        .eq("appointment_id", id)
        .maybeSingle();
      const isCouple = inquiryForIntake?.service_type === "couple";
      console.log("[Confirm Email] intakeToken:", intakeToken ? "SET" : "NULL", "| intakeSubmitted:", intakeSubmitted, "| isCouple:", isCouple, "→ showLink:", !!(intakeToken && !intakeSubmitted && !isCouple));
      const intakeSection = (intakeToken && !intakeSubmitted && !isCouple)
        ? `
          <div style="background:#f7f5ef;border:1px solid #d4c9b0;padding:18px 20px;margin:0 0 20px">
            <p style="margin:0 0 6px;color:#2d4a38;font-size:13px;font-weight:600">📋 預約前準備（選填）</p>
            <p style="margin:0 0 12px;color:#555;font-size:13px;line-height:1.7">為讓心理師在第一次晤談前更了解您的狀況，歡迎提前完成線上初談問卷。此步驟為選填，不填寫也不影響您的預約。</p>
            <a href="${SITE}/intake?token=${intakeToken}" style="display:inline-block;background:#2d4a38;color:#fff;padding:10px 22px;text-decoration:none;font-size:13px;font-weight:600">開始填寫初談問卷 →</a>
          </div>`
        : "";

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
              <p style="margin:0 0 20px;color:#444">您的諮商晤談預約已由心理輔導人員確認，詳情如下：</p>
              <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
                <tr><td ${tdL}>晤談時間</td><td ${tdR}><strong>${scheduledAt}</strong></td></tr>
                ${therapistProfile?.name ? `<tr><td ${tdL}>晤談人員</td><td ${tdR}>${therapistProfile.name} ${(therapistProfile as unknown as { title?: string | null }).title ?? "心理輔導師"}</td></tr>` : ""}
                <tr><td ${tdL}>晤談方式</td><td ${tdR}>${data.is_online ? "線上晤談（視訊）" : "面談"}</td></tr>
                ${data.is_online && data.meeting_link ? `<tr><td ${tdL}>視訊連結</td><td ${tdR}><a href="${data.meeting_link}" style="color:#2d4a38;word-break:break-all">${data.meeting_link}</a></td></tr>` : ""}
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
      }).catch(console.error);
    }
  }

  return NextResponse.json(data);
}
