import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

export async function GET(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });

  const therapistId = req.nextUrl.searchParams.get("therapist_id");
  if (!therapistId) return NextResponse.json({ error: "缺少 therapist_id" }, { status: 400 });

  // Therapists may only view their own
  if (auth.role === "therapist" && auth.profileId !== therapistId) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("therapist_availability")
    .select("*")
    .eq("therapist_id", therapistId)
    .order("day_of_week")
    .order("start_time");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });

  const body = await req.json() as {
    therapist_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
  };

  if (!body.therapist_id) return NextResponse.json({ error: "缺少 therapist_id" }, { status: 400 });
  if (body.day_of_week === undefined) return NextResponse.json({ error: "缺少 day_of_week" }, { status: 400 });
  if (!body.start_time || !body.end_time) return NextResponse.json({ error: "請填寫時間" }, { status: 400 });
  if (body.start_time >= body.end_time) return NextResponse.json({ error: "結束時間須晚於開始時間" }, { status: 400 });

  // Therapist can only edit their own
  if (auth.role === "therapist" && auth.profileId !== body.therapist_id) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }
  if (!isAdminLevel(auth.role) && auth.role !== "therapist") {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("therapist_availability")
    .insert({
      therapist_id: body.therapist_id,
      day_of_week: body.day_of_week,
      start_time: body.start_time,
      end_time: body.end_time,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });

  const body = await req.json() as { id: string; is_active?: boolean; start_time?: string; end_time?: string };
  if (!body.id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const db = createAdminClient();
  const { data: existing } = await db
    .from("therapist_availability")
    .select("therapist_id")
    .eq("id", body.id)
    .single();

  if (!existing) return NextResponse.json({ error: "找不到時段" }, { status: 404 });
  if (auth.role === "therapist" && auth.profileId !== existing.therapist_id) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }
  if (!isAdminLevel(auth.role) && auth.role !== "therapist") {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const { id, ...rest } = body;
  const { data, error } = await db
    .from("therapist_availability")
    .update(rest)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const db = createAdminClient();
  const { data: existing } = await db
    .from("therapist_availability")
    .select("therapist_id")
    .eq("id", id)
    .single();

  if (!existing) return NextResponse.json({ error: "找不到時段" }, { status: 404 });
  if (auth.role === "therapist" && auth.profileId !== existing.therapist_id) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }
  if (!isAdminLevel(auth.role) && auth.role !== "therapist") {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const { error } = await db.from("therapist_availability").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
