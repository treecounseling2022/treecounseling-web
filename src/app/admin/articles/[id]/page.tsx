import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ArticleEditor from "../ArticleEditor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .single();

  if (!article) notFound();

  return (
    <div className="space-y-6 pt-4">
      <div>
        <p className="font-sans text-xs text-muted mb-1">
          <a href="/admin/articles" className="hover:text-forest">文章管理</a> / 編輯
        </p>
        <h1 className="font-serif text-deep text-2xl truncate">{article.title}</h1>
      </div>
      <ArticleEditor isNew={false} initialData={article} />
    </div>
  );
}
