import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// director = 所長（最高權限，需明確設定 user_metadata.role = "director"）
// admin    = 行政（可管理成員、文章、邀請；不可邀請 director）
// therapist = 心理師（只能編輯自己的資料頁）
// none     = 未設定角色或角色值不明 → 視為無權限
export type UserRole = "director" | "admin" | "therapist" | "none";

export type AuthInfo = {
  userId: string;
  email: string | null;
  role: UserRole;
  profileId: string | null; // only for therapists
};

export async function getAuthInfo(): Promise<AuthInfo | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const meta = user.user_metadata ?? {};
    const role: UserRole =
      meta.role === "therapist"
        ? "therapist"
        : meta.role === "admin"
        ? "admin"
        : meta.role === "director"
        ? "director"
        : "none"; // 無 metadata 或不明角色值 → 無權限

    let profileId: string | null = null;
    if (role === "therapist") {
      const { data } = await supabase
        .from("therapist_profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();
      profileId = data?.id ?? null;
    }

    return { userId: user.id, email: user.email ?? null, role, profileId };
  } catch {
    return null;
  }
}

// Returns true if director or admin (full admin access)
export function isAdminLevel(role: UserRole): boolean {
  return role === "director" || role === "admin";
}

// Convenience: require auth + optionally require specific roles.
// Redirects to login if unauthenticated, /admin if wrong role.
export async function requireAuth(allowedRoles?: UserRole[]): Promise<AuthInfo> {
  const auth = await getAuthInfo();
  if (!auth || auth.role === "none") {
    redirect("/admin/login");
  }
  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    redirect("/admin");
  }
  return auth;
}
