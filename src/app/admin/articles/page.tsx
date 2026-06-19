import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth-role";

export default async function ArticlesAdminPage() {
  const auth = await requireAuth();
  const supabase = await createClient();

  let therapistName: string | null = null;
  if (auth.role === "therapist" && auth.profileId) {
    const { data: profile } = await supabase
      .from("therapist_profiles")
      .select("name")
      .eq("id", auth.profileId)
      .single();
    therapistName = profile?.name ?? null;
  }

  const baseQuery = supabase
    .from("articles")
    .select("id, title, category, date, author, published")
    .order("date", { ascending: false });

  const { data: articles } = await (therapistName
    ? baseQuery.eq("author", therapistName)
    : baseQuery);

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-deep text-2xl mb-1">
            {therapistName ? "我的文章" : "文章管理"}
          </h1>
          <p className="font-sans text-xs text-muted">
            {therapistName ? "管理你發布的文章。" : "管理最新消息與心理知識文章。"}
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="px-5 py-2.5 bg-forest text-paper font-sans text-xs tracking-widest hover:bg-deep transition-colors"
        >
          + 新增文章
        </Link>
      </div>

      {!articles || articles.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-sand/30 bg-white">
          <p className="font-sans text-sm text-muted/60">尚無文章，點擊右上角新增。</p>
        </div>
      ) : (
        <div className="bg-white border border-sand/15 divide-y divide-sand/10">
          {articles.map((article) => (
            <div key={article.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="font-serif text-deep text-sm truncate">{article.title}</p>
                <p className="font-sans text-xs text-muted mt-0.5">
                  {article.category} · {article.author} · {article.date}
                </p>
              </div>
              <span
                className={`font-sans text-[10px] px-2 py-0.5 border ${
                  article.published
                    ? "border-forest/40 text-forest bg-forest/5"
                    : "border-sand/40 text-sand bg-sand/5"
                }`}
              >
                {article.published ? "已發布" : "草稿"}
              </span>
              <Link
                href={`/admin/articles/${article.id}`}
                className="font-sans text-xs text-muted hover:text-forest transition-colors"
              >
                編輯
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
