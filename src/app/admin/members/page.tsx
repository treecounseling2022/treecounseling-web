import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth-role";
import { TEAM } from "@/lib/data";

export default async function MembersAdminPage() {
  const auth = await requireAuth();

  if (auth.role === "therapist") {
    redirect(auth.profileId ? `/admin/members/${auth.profileId}` : "/admin");
  }

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("therapist_profiles")
    .select("id, name, name_en, title, photo_url, auth_user_id");

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h1 className="font-serif text-deep text-2xl mb-1">成員資料</h1>
        <p className="font-sans text-xs text-muted">選擇成員以編輯其資料。</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TEAM.map((member) => {
          const p = profileMap[member.id];
          const name = p?.name || (
            <span className="text-sand/50 italic">未填寫</span>
          );
          const nameEn = p?.name_en || "";
          const title = p?.title || (
            <span className="text-sand/40 italic text-[11px]">未填寫</span>
          );
          const photo = p?.photo_url || null;
          const hasAccount = !!p?.auth_user_id;

          return (
            <Link
              key={member.id}
              href={`/admin/members/${member.id}`}
              className="flex items-center gap-4 p-5 bg-white border border-sand/20 hover:border-forest/40 hover:shadow-sm transition-all"
            >
              <div className="w-12 h-16 flex-shrink-0 overflow-hidden bg-sand/10">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo}
                    alt=""
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sand/30 font-sans text-[10px]">
                    無相片
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-deep">{name}</p>
                {nameEn && (
                  <p className="font-garamond text-muted/70 text-sm">{nameEn}</p>
                )}
                <p className="font-sans text-[11px] text-sand mt-0.5">{title}</p>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className="font-sans text-xs text-muted/40">編輯 →</span>
                <span
                  className={`font-sans text-[10px] px-2 py-0.5 ${
                    hasAccount
                      ? "bg-forest/10 text-forest"
                      : "bg-sand/20 text-muted/60"
                  }`}
                >
                  {hasAccount ? "已連結" : "未連結"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
