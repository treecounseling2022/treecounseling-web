import { NextResponse } from "next/server";
import { getAuthInfo } from "@/lib/auth-role";

export async function GET() {
  const auth = await getAuthInfo();
  if (!auth) return NextResponse.json({ error: "未授權" }, { status: 403 });
  return NextResponse.json({
    role: auth.role,
    profileId: auth.profileId,
    email: auth.email,
  });
}
