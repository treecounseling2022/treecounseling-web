import { requireAuth } from "@/lib/auth-role";
import { createClient } from "@/lib/supabase/server";
import InviteForm from "./InviteForm";

export default async function InvitePage() {
  const auth = await requireAuth(["director", "admin"]);

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("therapist_profiles")
    .select("id, name, auth_user_id")
    .order("name");

  const members = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.name || p.id,
    hasAccount: !!p.auth_user_id,
  }));

  const roleLabel: Record<string, string> = {
    director: "所長",
    admin: "行政",
    therapist: "心理師",
  };

  return (
    <div className="space-y-10 pt-4">
      <div>
        <h1 className="font-serif text-deep text-2xl mb-1">邀請成員</h1>
        <p className="font-sans text-xs text-muted">
          輸入對方的 Email，系統會發送邀請信。心理師登入後只能編輯自己的資料頁面。
        </p>
      </div>

      <div className="bg-white border border-sand/20 p-8">
        <InviteForm members={members} isDirector={auth.role === "director"} />
      </div>

      <div className="space-y-3">
        <h2 className="font-serif text-deep text-lg">成員帳號狀態</h2>
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-4 bg-white border border-sand/20"
            >
              <span className="font-sans text-sm text-deep">{m.name}</span>
              <span
                className={`font-sans text-[11px] px-3 py-1 ${
                  m.hasAccount
                    ? "bg-forest/10 text-forest"
                    : "bg-sand/20 text-muted"
                }`}
              >
                {m.hasAccount ? "已連結帳號" : "尚未連結"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[11px] font-sans text-muted/50 border-t border-sand/10 pt-4">
        目前登入：{auth.email}（{roleLabel[auth.role]}）
      </div>
    </div>
  );
}
