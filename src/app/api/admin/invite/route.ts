import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

export async function POST(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const body = (await req.json()) as {
    email?: string;
    profileId?: string;
    role?: string;
  };
  const { email, profileId, role: targetRole } = body;

  if (!email?.trim()) {
    return NextResponse.json({ error: "請輸入 Email" }, { status: 400 });
  }

  // Only director can create admin accounts
  const inviteRole =
    targetRole === "admin" && auth.role === "director" ? "admin" : "therapist";

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "伺服器未設定 SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email.trim(),
    {
      data: { role: inviteRole },
      redirectTo: `${siteUrl}/auth/callback`,
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (profileId && data.user && inviteRole === "therapist") {
    const { error: linkError } = await supabaseAdmin
      .from("therapist_profiles")
      .update({ auth_user_id: data.user.id })
      .eq("id", profileId);

    if (linkError) {
      return NextResponse.json({
        success: true,
        warning: "邀請已發送，但連結成員資料失敗：" + linkError.message,
        userId: data.user.id,
      });
    }
  }

  return NextResponse.json({
    success: true,
    userId: data.user?.id,
    inviteRole,
  });
}
