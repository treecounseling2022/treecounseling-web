import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Booking API error:", err);
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}
