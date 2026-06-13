"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { TEAM } from "@/lib/data";

type ArticleData = {
  id: string;
  title: string;
  category: string;
  date: string;
  author: string;
  read_time: string;
  excerpt: string;
  photo: string;
  content: string;
  published: boolean;
};

const CATEGORIES = ["心理知識", "活動", "公告", "其他"];

export default function ArticleEditor({
  isNew,
  initialData,
}: {
  isNew: boolean;
  initialData: ArticleData;
}) {
  const router = useRouter();
  const [data, setData] = useState<ArticleData>(initialData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof ArticleData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setData((p) => ({ ...p, [field]: e.target.value }));

  const handleSave = async (publish?: boolean) => {
    if (!data.title.trim() || !data.content.trim()) {
      setError("標題和內容不可為空");
      return;
    }
    setError("");
    setSaving(true);

    const payload = {
      ...data,
      ...(publish !== undefined ? { published: publish } : {}),
    };

    const supabase = createClient();
    const { error: dbErr } = isNew
      ? await supabase.from("articles").insert(payload)
      : await supabase.from("articles").update(payload).eq("id", data.id);

    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    router.push("/admin/articles");
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("確定要刪除這篇文章嗎？")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("articles").delete().eq("id", data.id);
    router.push("/admin/articles");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {error && (
        <p className="font-sans text-xs text-red-500 bg-red-50 border border-red-200 px-4 py-2">
          {error}
        </p>
      )}

      {/* 基本資訊 */}
      <div className="bg-white border border-sand/15 p-6 space-y-4">
        <h2 className="font-serif text-deep text-base border-b border-sand/15 pb-2">基本資訊</h2>

        <div className="space-y-1.5">
          <label className={labelCls}>文章 ID（英文，建立後不可更改）</label>
          <input
            value={data.id}
            onChange={set("id")}
            disabled={!isNew}
            placeholder="例如：counseling-tips-2026"
            className={cn(inputCls, !isNew && "opacity-50 cursor-not-allowed")}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>標題 *</label>
          <input value={data.title} onChange={set("title")} placeholder="文章標題" className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>分類</label>
            <select value={data.category} onChange={set("category")} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>作者</label>
            <select value={data.author} onChange={set("author")} className={inputCls}>
              {TEAM.map((m) => <option key={m.id}>{m.name}</option>)}
              <option>工作室行政</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>發布日期</label>
            <input type="date" value={data.date} onChange={set("date")} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>閱讀時間</label>
            <input value={data.read_time} onChange={set("read_time")} placeholder="5 分鐘" className={inputCls} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>封面圖片 URL</label>
          <input value={data.photo} onChange={set("photo")} placeholder="https://..." className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>文章摘要（顯示於列表）</label>
          <textarea
            rows={2}
            value={data.excerpt}
            onChange={set("excerpt")}
            placeholder="一兩句話概括文章重點"
            className={cn(inputCls, "resize-none")}
          />
        </div>
      </div>

      {/* 內容 */}
      <div className="bg-white border border-sand/15 p-6 space-y-3">
        <div className="flex items-center justify-between border-b border-sand/15 pb-2">
          <h2 className="font-serif text-deep text-base">文章內容 *</h2>
          <span className="font-sans text-[10px] text-muted/60">支援 Markdown 語法</span>
        </div>
        <textarea
          rows={20}
          value={data.content}
          onChange={set("content")}
          placeholder="在此撰寫文章內容，支援 Markdown（## 標題、**粗體**、1. 清單等）"
          className={cn(inputCls, "resize-y font-mono text-[13px] leading-relaxed")}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-sand/20">
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="px-6 py-2.5 bg-forest text-paper font-sans text-xs tracking-widest hover:bg-deep transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? "儲存中…" : data.published ? "更新並發布" : "發布"}
        </button>
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="px-6 py-2.5 border border-sand/40 text-muted font-sans text-xs hover:border-forest hover:text-forest transition-colors disabled:opacity-50 cursor-pointer"
        >
          儲存草稿
        </button>
        {!isNew && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto px-4 py-2.5 border border-red-200 text-red-400 font-sans text-xs hover:bg-red-50 transition-colors cursor-pointer"
          >
            刪除
          </button>
        )}
      </div>
    </div>
  );
}

const labelCls = "block font-sans text-xs text-deep/80";
const inputCls =
  "w-full border border-sand/25 bg-soft/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest transition-colors";
