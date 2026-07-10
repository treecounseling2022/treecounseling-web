import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth-role";
import ArticleEditor from "../ArticleEditor";
import { todayInMacau } from "@/lib/utils";

const today = todayInMacau();

export default async function NewArticlePage() {
  const auth = await requireAuth();

  let lockedAuthor: string | undefined;
  let defaultAuthor = "工作室行政";

  if (auth.role === "therapist" && auth.profileId) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("therapist_profiles")
      .select("name")
      .eq("id", auth.profileId)
      .single();
    if (profile?.name) {
      lockedAuthor = profile.name;
      defaultAuthor = profile.name;
    }
  }

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h1 className="font-serif text-deep text-2xl">新增文章</h1>
      </div>
      <ArticleEditor
        isNew
        lockedAuthor={lockedAuthor}
        initialData={{
          id: "",
          title: "",
          category: "心理知識",
          date: today,
          author: defaultAuthor,
          read_time: "5 分鐘",
          excerpt: "",
          photo: "",
          content: "",
          published: false,
        }}
      />
    </div>
  );
}
