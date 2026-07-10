import { renderToBuffer, Document } from "@react-pdf/renderer";
import { createElement, type ReactElement, type ComponentProps } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { ClientIntakePDF } from "@/lib/intake-pdf";
import { uploadPDFToDrive } from "@/lib/google-drive";
import { todayInMacau } from "@/lib/utils";

export interface ClientPDFResult {
  pdfBuffer: Buffer;
  driveUrl: string | null;
  fileName: string;
  clientName: string;
}

export async function generateClientPDF(
  clientId: string,
  label: "預約資料" | "初談資料"
): Promise<ClientPDFResult> {
  const db = createAdminClient();

  const [{ data: client }, { data: appointments }] = await Promise.all([
    db.from("clients")
      .select("id, full_name, dob, gender, phone, email, service_type, intake_summary, intake_submitted_at")
      .eq("id", clientId)
      .single(),
    db.from("appointments")
      .select("id, scheduled_at, booking_status, session_fee, currency, therapist_id")
      .eq("client_id", clientId)
      .neq("booking_status", "cancelled")
      .order("scheduled_at", { ascending: true }),
  ]);

  if (!client) throw new Error(`Client ${clientId} not found`);

  const tIds = [
    ...new Set((appointments ?? []).map((a) => a.therapist_id).filter(Boolean)),
  ] as string[];
  let nameMap: Record<string, string> = {};
  if (tIds.length > 0) {
    const { data: therapists } = await db
      .from("therapist_profiles")
      .select("id, name")
      .in("id", tIds);
    nameMap = Object.fromEntries((therapists ?? []).map((t) => [t.id, t.name]));
  }

  const apptRows = (appointments ?? []).map((a) => ({
    scheduled_at: a.scheduled_at,
    booking_status: a.booking_status,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session_fee: (a as any).session_fee ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currency: (a as any).currency ?? "MOP",
    therapist_name: a.therapist_id ? (nameMap[a.therapist_id] ?? null) : null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = client as any;
  const generatedAt = new Date().toLocaleString("zh-TW", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Macau",
  });

  const pdfElement = createElement(ClientIntakePDF, {
    clientName: client.full_name,
    dob: c.dob ?? null,
    gender: c.gender ?? null,
    phone: c.phone ?? null,
    email: c.email ?? null,
    serviceType: c.service_type ?? null,
    appointments: apptRows,
    intakeSummary: c.intake_summary ?? null,
    intakeSubmittedAt: c.intake_submitted_at ?? null,
    generatedAt,
  }) as unknown as ReactElement<ComponentProps<typeof Document>>;

  const pdfBuffer = Buffer.from(await renderToBuffer(pdfElement));

  const safeName = client.full_name.replace(/[/\\?%*:|"<>]/g, "_");
  const dateStr = todayInMacau();
  const fileName = `${dateStr}_${safeName}_${label}.pdf`;

  let driveUrl: string | null = null;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      driveUrl = await uploadPDFToDrive(
        pdfBuffer,
        fileName,
        process.env.GOOGLE_DRIVE_FOLDER_ID ?? undefined,
        client.full_name
      );
    } catch (e) {
      console.error("Drive upload failed:", e);
    }
  }

  return { pdfBuffer, driveUrl, fileName, clientName: client.full_name };
}
