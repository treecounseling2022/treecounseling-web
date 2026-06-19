import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth-role";
import ArticleEditor from "../ArticleEditor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params;
  const auth = await requireAuth();
  const supabase = await createClient();

  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .single();

  if (!article) notFound();

  let lockedAuthor: string | undefined;

  if (auth.role === "therapist" && auth.profileId) {
    const { data: profile } = await supabase
      .from("therapist_profiles")
      .select("name")
      .eq("id", auth.profileId)
      .single();

    if (!profile?.name || article.author !== profile.name) {
      redirect("/admin/articles");
    }
    lockedAuthor = profile.name;
  }

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h1 className="font-serif text-deep text-2xl truncate">{article.title}</h1>
      </div>
      <ArticleEditor isNew={false} lockedAuthor={lockedAuthor} initialData={article} />
    </div>
  );
}
