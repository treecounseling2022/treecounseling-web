import { createClient } from "@/lib/supabase/server";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";
import { NextRequest, NextResponse } from "next/server";

type PresentingConcern = { category: string; items: string[] };

type ClientRow = {
  full_name: string;
  gender: string;
  dob: string;
  city: string;
  email: string;
  phone: string;
  native_language: string;
  preferred_meeting_type: string;
  service_type: string;
  has_psychiatry_history: boolean | null;
  psychiatry_notes: string;
  has_prior_counseling: boolean | null;
  prior_counseling_notes: string;
  intake_notes: string;
  preferred_times: string;
  presenting_concerns: PresentingConcern[];
  relationship_duration: string;
  children_info: string;
  admin_notes: string;
};

export async function POST(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminLevel(auth.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();

  const body = await req.json();
  const rows: ClientRow[] = body.rows ?? [];

  const results: Array<{ name: string; ok: boolean; error?: string }> = [];

  for (const row of rows) {
    const name = row.full_name || "（無姓名）";

    const payload: Record<string, unknown> = {
      full_name: row.full_name || null,
      gender: row.gender || null,
      dob: row.dob || null,
      city: row.city || null,
      email: row.email || null,
      phone: row.phone || null,
      native_language: row.native_language || null,
      preferred_meeting_type: row.preferred_meeting_type || null,
      service_type: row.service_type || "individual",
      has_psychiatry_history: row.has_psychiatry_history,
      psychiatry_notes: row.psychiatry_notes || null,
      has_prior_counseling: row.has_prior_counseling,
      prior_counseling_notes: row.prior_counseling_notes || null,
      intake_notes: row.intake_notes || null,
      preferred_times: row.preferred_times || null,
      presenting_concerns: row.presenting_concerns?.length ? row.presenting_concerns : null,
      relationship_duration: row.relationship_duration || null,
      children_info: row.children_info || null,
      admin_notes: row.admin_notes || null,
      is_active: true,
    };

    const { error } = await supabase.from("clients").insert(payload);

    if (error) {
      results.push({ name, ok: false, error: error.message });
    } else {
      results.push({ name, ok: true });
    }
  }

  return NextResponse.json({ results });
}
