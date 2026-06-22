import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, isAdminLevel } from "@/lib/auth-role";

export default async function MembersAdminPage() {
  const auth = await requireAuth();

  if (auth.role === "therapist") {
    redirect(auth.profileId ? `/admin/members/${auth.profileId}` : "/admin");
  }

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("therapist_profiles")
    .select("id, name, name_en, title, photo_url, auth_user_id")
    .order("name");

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-deep text-2xl mb-1">成員資料</h1>
          <p className="font-sans text-xs text-muted">選擇成員以編輯其資料。</p>
        </div>
        {isAdminLevel(auth.role) && (
          <Link
            href="/admin/members/new"
            className="font-sans text-xs bg-deep text-paper px-4 py-2 hover:bg-forest transition-colors flex-shrink-0"
          >
            + 新增心理師
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(profiles ?? []).map((p) => {
          const displayName = p.name || <span className="text-sand/50 italic">未填寫</span>;
          const displayTitle = p.title || <span className="text-sand/40 italic text-[11px]">未填職稱</span>;

          return (
            <Link
              key={p.id}
              href={`/admin/members/${p.id}`}
              className="flex items-center gap-4 p-5 bg-white border border-sand/20 hover:border-forest/40 hover:shadow-sm transition-all"
            >
              <div className="w-12 h-16 flex-shrink-0 overflow-hidden bg-sand/10">
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt="" className="w-full h-full object-cover object-top" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sand/30 font-sans text-[10px]">
                    無相片
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-deep">{displayName}</p>
                {p.name_en && (
                  <p className="font-garamond text-muted/70 text-sm">{p.name_en}</p>
                )}
                <p className="font-sans text-[11px] text-sand mt-0.5">{displayTitle}</p>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className="font-sans text-xs text-muted/40">編輯 →</span>
                <span className={`font-sans text-[10px] px-2 py-0.5 ${p.auth_user_id ? "bg-forest/10 text-forest" : "bg-sand/20 text-muted/60"}`}>
                  {p.auth_user_id ? "已連結" : "未連結"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
