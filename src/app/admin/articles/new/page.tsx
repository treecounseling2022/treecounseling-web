import ArticleEditor from "../ArticleEditor";

const today = new Date().toISOString().split("T")[0];

export default function NewArticlePage() {
  return (
    <div className="space-y-6 pt-4">
      <div>
        <p className="font-sans text-xs text-muted mb-1">
          <a href="/admin/articles" className="hover:text-forest">文章管理</a> / 新增文章
        </p>
        <h1 className="font-serif text-deep text-2xl">新增文章</h1>
      </div>
      <ArticleEditor
        isNew
        initialData={{
          id: "",
          title: "",
          category: "心理知識",
          date: today,
          author: "工作室行政",
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
