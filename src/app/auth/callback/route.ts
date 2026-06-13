import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/admin/login?error=auth_failed`);
    }
  }

  // Determine redirect based on role
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/admin/login`);
  }

  const role = user.user_metadata?.role;

  if (role === "therapist") {
    const { data } = await supabase
      .from("therapist_profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (data?.id) {
      return NextResponse.redirect(`${origin}/admin/members/${data.id}`);
    }
    return NextResponse.redirect(`${origin}/admin`);
  }

  return NextResponse.redirect(`${origin}/admin`);
}
