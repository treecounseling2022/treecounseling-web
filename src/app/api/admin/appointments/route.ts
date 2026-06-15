import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";
import { checkTimeConflict } from "@/lib/appointments";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });
  const db = createAdminClient();

  // Admin sees all; therapist sees only their own
  let query = db
    .from("appointments")
    .select("*, clients(id, full_name, phone), rooms(id, name, color)")
    .order("created_at", { ascending: false });

  if (auth.role === "therapist" && auth.profileId) {
    query = query.eq("therapist_id", auth.profileId);
  } else if (!isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const { data: appointments, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch therapist names separately (text FK, no auto-join)
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

export async function POST(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });

  const body = await req.json();
  const db = createAdminClient();

  // ── Therapist self-booking ──────────────────────────────────────────────────
  if (auth.role === "therapist" && auth.profileId) {
    if (!body.client_id) return NextResponse.json({ error: "缺少個案" }, { status: 400 });
    if (!body.scheduled_at) return NextResponse.json({ error: "請選擇晤談時間" }, { status: 400 });

    // Verify therapist has access to this client
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

    // Fetch client info if not already loaded
    const client = assignedClient ?? (
      await db.from("clients").select("id, full_name, email").eq("id", body.client_id).single()
    ).data;
    void client;

    // Auto-detect intake: first ever appointment for this client
    const { count: existingCount } = await db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("client_id", body.client_id)
      .neq("booking_status", "cancelled");
    const sessionType = (existingCount ?? 0) === 0 ? "intake" : "followup";

    // Conflict check
    const conflict = await checkTimeConflict(db, auth.profileId, body.scheduled_at, body.duration_minutes ?? 50);
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });

    // Create confirmed appointment directly
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
        admin_notes: body.admin_notes ?? null,
        booking_status: "confirmed",
        session_type: sessionType,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Send confirmation email to client for therapist self-booking (already confirmed)
    if (process.env.RESEND_API_KEY && client?.email && newAppt) {
      const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@treecounseling.com";
      const WHATSAPP_LINK = "https://wa.me/85362772234";
      const tdL = `style="color:#333;padding:8px 18px 8px 0;border-bottom:1px solid #e0e0e0;white-space:nowrap;font-size:14px;font-weight:600"`;
      const tdR = `style="padding:8px 0;border-bottom:1px solid #e0e0e0;font-size:14px;color:#111"`;
      const { data: therapistProfile } = await db
        .from("therapist_profiles").select("name").eq("id", auth.profileId).single();
      const scheduledAt = new Date(body.scheduled_at).toLocaleString("zh-TW", {
        year: "numeric", month: "long", day: "numeric",
        weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Macau",
      });
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
              <p style="margin:0 0 20px;color:#444">您的諮商晤談已安排如下：</p>
              <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
                <tr><td ${tdL}>晤談時間</td><td ${tdR}><strong>${scheduledAt}</strong></td></tr>
                ${therapistProfile?.name ? `<tr><td ${tdL}>晤談人員</td><td ${tdR}>${therapistProfile.name} 心理輔導師</td></tr>` : ""}
                <tr><td ${tdL}>晤談方式</td><td ${tdR}>${body.is_online ? "線上晤談（視訊）" : "到診面談"}</td></tr>
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

    return NextResponse.json(newAppt, { status: 201 });
  }

  // ── Admin booking ───────────────────────────────────────────────────────────
  if (!isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }
  if (!body.client_id) return NextResponse.json({ error: "請選擇個案" }, { status: 400 });

  // Auto-detect intake: first ever appointment for this client
  const { count: existingCount } = await db
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("client_id", body.client_id)
    .neq("booking_status", "cancelled");
  const autoSessionType = (existingCount ?? 0) === 0 ? "intake" : "followup";

  // Conflict check (only if therapist and time are both specified)
  if (body.therapist_id && body.scheduled_at) {
    const conflict = await checkTimeConflict(db, body.therapist_id, body.scheduled_at, body.duration_minutes ?? 50);
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });
  }

  const { data, error } = await db
    .from("appointments")
    .insert({
      ...body,
      booking_status: "pending_admin",
      session_type: body.session_type ?? autoSessionType,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
