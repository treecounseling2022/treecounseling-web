import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, Document } from "@react-pdf/renderer";
import { createElement, type ReactElement, type ComponentProps } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";
import { uploadPDFToDrive } from "@/lib/google-drive";
import { ClientIntakePDF } from "@/lib/intake-pdf";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const { id } = await params;
  const db = createAdminClient();

  // Fetch client + appointments in parallel
  const [{ data: client }, { data: appointments }] = await Promise.all([
    db.from("clients")
      .select("id, full_name, dob, gender, phone, email, service_type, intake_token, intake_summary, intake_submitted_at, created_at")
      .eq("id", id)
      .single(),
    db.from("appointments")
      .select("id, scheduled_at, booking_status, session_fee, currency, therapist_id")
      .eq("client_id", id)
      .neq("booking_status", "cancelled")
      .order("scheduled_at", { ascending: true }),
  ]);

  if (!client) return NextResponse.json({ error: "找不到個案" }, { status: 404 });

  // Resolve therapist names
  const tIds = [...new Set((appointments ?? []).map((a) => a.therapist_id).filter(Boolean))] as string[];
  let nameMap: Record<string, string> = {};
  if (tIds.length > 0) {
    const { data: therapists } = await db.from("therapist_profiles").select("id, name").in("id", tIds);
    nameMap = Object.fromEntries((therapists ?? []).map((t) => [t.id, t.name]));
  }

  const apptRows = (appointments ?? []).map((a) => ({
    scheduled_at: a.scheduled_at,
    booking_status: a.booking_status,
    session_fee: a.session_fee,
    currency: a.currency ?? "MOP",
    therapist_name: a.therapist_id ? (nameMap[a.therapist_id] ?? null) : null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientExt = client as any;
  const generatedAt = new Date().toLocaleString("zh-TW", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Macau",
  });

  const pdfElement = createElement(ClientIntakePDF, {
    clientName: client.full_name,
    dob: clientExt.dob ?? null,
    gender: clientExt.gender ?? null,
    phone: clientExt.phone ?? null,
    email: clientExt.email ?? null,
    serviceType: clientExt.service_type ?? null,
    appointments: apptRows,
    intakeSummary: clientExt.intake_summary ?? null,
    intakeSubmittedAt: clientExt.intake_submitted_at ?? null,
    generatedAt,
  }) as unknown as ReactElement<ComponentProps<typeof Document>>;

  const pdfBuffer = Buffer.from(await renderToBuffer(pdfElement));

  const safeName = client.full_name.replace(/[/\\?%*:|"<>]/g, "_");
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `${dateStr}_${safeName}_個案資料.pdf`;

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  let driveUrl: string | null = null;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    driveUrl = await uploadPDFToDrive(pdfBuffer, fileName, folderId ?? undefined);
  } else {
    // Return PDF directly as download if Drive not configured
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  }

  return NextResponse.json({ driveUrl, fileName });
}
