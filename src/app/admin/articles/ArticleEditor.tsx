"use client";

import { useState, useRef, useCallback } from "react";
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
const BUCKET = "article-images";

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0] || null;
    return null;
  } catch {
    return null;
  }
}

export default function ArticleEditor({
  isNew,
  initialData,
  lockedAuthor,
}: {
  isNew: boolean;
  initialData: ArticleData;
  lockedAuthor?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<ArticleData>({
    ...initialData,
    ...(lockedAuthor ? { author: lockedAuthor } : {}),
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // IG state
  const [igUrl, setIgUrl] = useState("");
  const [igCaption, setIgCaption] = useState("");
  const [igAuthor, setIgAuthor] = useState("");
  const [igFetching, setIgFetching] = useState(false);
  const [igFetchStatus, setIgFetchStatus] = useState<"idle" | "found" | "notfound">("idle");

  // YouTube state
  const [ytUrl, setYtUrl] = useState("");

  // Shared media error
  const [mediaError, setMediaError] = useState("");

  // Upload state
  const [coverUploading, setCoverUploading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Refs
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof ArticleData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setData((p) => ({ ...p, [field]: e.target.value }));

  // Insert text at cursor position in the content textarea
  const insertAtCursor = useCallback((text: string) => {
    const ta = contentRef.current;
    const start = ta?.selectionStart ?? data.content.length;
    const end = ta?.selectionEnd ?? data.content.length;
    const current = ta?.value ?? data.content;
    const newContent = current.slice(0, start) + text + current.slice(end);
    const newPos = start + text.length;
    setData((p) => ({ ...p, content: newContent }));
    requestAnimationFrame(() => {
      if (contentRef.current) {
        contentRef.current.selectionStart = newPos;
        contentRef.current.selectionEnd = newPos;
        contentRef.current.focus();
      }
    });
  }, [data.content]);

  // Upload image to Supabase Storage, return public URL
  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true });
    if (uploadErr) {
      setMediaError(uploadErr.message);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return publicUrl;
  };

  // Cover photo upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    setMediaError("");
    const url = await uploadImage(file, "covers");
    if (url) setData((p) => ({ ...p, photo: url }));
    setCoverUploading(false);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  // Content image insert
  const handleImageInsert = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    setMediaError("");
    const url = await uploadImage(file, "content");
    if (url) {
      const name = file.name.replace(/\.[^.]+$/, "");
      insertAtCursor(`\n\n![${name}](${url})\n\n`);
    }
    setImageUploading(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // IG: auto-fetch caption (scrapes og:description, no API key needed)
  const handleIgAutoFetch = async () => {
    if (!igUrl.trim()) return;
    setIgFetching(true);
    setIgFetchStatus("idle");
    setMediaError("");
    try {
      const res = await fetch("/api/admin/articles/import-ig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: igUrl.trim() }),
      });
      const result = await res.json();
      if (!res.ok) {
        setMediaError(result.error ?? "擷取失敗");
        return;
      }
      if (result.caption) {
        setIgCaption(result.caption);
        setIgAuthor(result.authorName ?? "");
        setIgFetchStatus("found");
      } else {
        setIgFetchStatus("notfound");
      }
    } catch {
      setMediaError("網路錯誤，請稍後再試");
    } finally {
      setIgFetching(false);
    }
  };

  // IG: insert embed (+ caption if filled)
  const handleIgInsert = () => {
    if (!igUrl.trim()) return;
    setMediaError("");
    // We need the canonical URL — extract shortcode client-side as best effort
    const scMatch = igUrl.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    if (!scMatch) {
      setMediaError("無法識別 Instagram 貼文連結");
      return;
    }
    const canonicalUrl = `https://www.instagram.com/p/${scMatch[1]}/`;
    let text = "";
    if (igCaption.trim()) {
      text = `\n\n${igCaption.trim()}\n\n%%ig:${canonicalUrl}%%\n\n`;
    } else {
      text = `\n\n%%ig:${canonicalUrl}%%\n\n`;
    }
    insertAtCursor(text);
    setIgUrl("");
    setIgCaption("");
    setIgAuthor("");
    setIgFetchStatus("idle");
  };

  // YouTube embed insert
  const handleYtInsert = () => {
    if (!ytUrl.trim()) return;
    setMediaError("");
    const videoId = extractYouTubeId(ytUrl.trim());
    if (!videoId) {
      setMediaError("無法識別 YouTube 連結，請確認格式正確");
      return;
    }
    insertAtCursor(`\n\n%%yt:https://www.youtube.com/watch?v=${videoId}%%\n\n`);
    setYtUrl("");
  };

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

  const igUrlTrimmed = igUrl.trim();

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
            {lockedAuthor ? (
              <input value={lockedAuthor} disabled className={cn(inputCls, "opacity-60 cursor-not-allowed")} />
            ) : (
              <select value={data.author} onChange={set("author")} className={inputCls}>
                {TEAM.map((m) => <option key={m.id}>{m.name}</option>)}
                <option>工作室行政</option>
              </select>
            )}
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

        {/* Cover photo with upload */}
        <div className="space-y-1.5">
          <label className={labelCls}>封面圖片</label>
          <div className="flex gap-2">
            <input
              value={data.photo}
              onChange={set("photo")}
              placeholder="https://… 或點擊右側上傳"
              className={cn(inputCls, "flex-1")}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
              className="px-3 py-2 border border-sand/30 text-muted font-sans text-xs hover:border-forest hover:text-forest transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap"
            >
              {coverUploading ? "上傳中…" : "上傳圖片"}
            </button>
          </div>
          {data.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.photo} alt="封面預覽" className="mt-2 h-24 w-auto border border-sand/15 object-cover" />
          )}
        </div>
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />

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

        {/* Media toolbar */}
        <div className="bg-sand/5 border border-sand/20 px-4 py-3 space-y-3">
          <p className="font-sans text-[10px] text-muted/50 tracking-wide uppercase">插入多媒體</p>

          {/* Image upload */}
          <div className="flex items-center gap-2">
            <span className="font-sans text-[11px] text-deep/60 w-14 flex-shrink-0">圖片</span>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={imageUploading}
              className="px-3 py-1.5 border border-sand/30 text-muted font-sans text-xs hover:border-forest hover:text-forest transition-colors disabled:opacity-40 cursor-pointer"
            >
              {imageUploading ? "上傳中…" : "從電腦選取"}
            </button>
            <span className="font-sans text-[10px] text-muted/40">插入游標位置</span>
          </div>

          {/* IG embed */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-sans text-[11px] text-deep/60 w-14 flex-shrink-0">IG 貼文</span>
              <input
                value={igUrl}
                onChange={(e) => {
                  setIgUrl(e.target.value);
                  setIgCaption("");
                  setIgAuthor("");
                  setIgFetchStatus("idle");
                }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleIgAutoFetch(); } }}
                placeholder="貼上 Instagram 連結…"
                className={cn(inputCls, "flex-1 text-xs py-1.5")}
              />
              <button
                type="button"
                onClick={handleIgAutoFetch}
                disabled={igFetching || !igUrlTrimmed}
                className="px-3 py-1.5 border border-sand/30 text-muted font-sans text-xs hover:border-forest hover:text-forest transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                {igFetching ? "擷取中…" : "擷取說明"}
              </button>
              <button
                type="button"
                onClick={handleIgInsert}
                disabled={!igUrlTrimmed}
                className="px-3 py-1.5 bg-deep text-paper font-sans text-xs hover:bg-forest transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                插入
              </button>
            </div>

            {/* Caption field — shown when URL is filled */}
            {igUrlTrimmed && (
              <div className="ml-16 space-y-1">
                {igFetchStatus === "found" && (
                  <p className="font-sans text-[10px] text-forest">
                    {igAuthor ? `@${igAuthor} · ` : ""}已自動擷取說明文字，可自行編輯
                  </p>
                )}
                {igFetchStatus === "notfound" && (
                  <p className="font-sans text-[10px] text-muted/50">
                    未能自動擷取，可手動貼上說明文字（或留空直接插入貼文）
                  </p>
                )}
                {igFetchStatus === "idle" && (
                  <p className="font-sans text-[10px] text-muted/40">
                    可點「擷取說明」自動取得文字，或直接手動填寫
                  </p>
                )}
                <textarea
                  rows={3}
                  value={igCaption}
                  onChange={(e) => setIgCaption(e.target.value)}
                  placeholder="說明文字（選填）"
                  className={cn(inputCls, "text-xs py-1.5 resize-none")}
                />
              </div>
            )}
          </div>

          {/* YouTube embed */}
          <div className="flex items-center gap-2">
            <span className="font-sans text-[11px] text-deep/60 w-14 flex-shrink-0">YouTube</span>
            <input
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleYtInsert(); } }}
              placeholder="貼上 YouTube 連結…"
              className={cn(inputCls, "flex-1 text-xs py-1.5")}
            />
            <button
              type="button"
              onClick={handleYtInsert}
              disabled={!ytUrl.trim()}
              className="px-3 py-1.5 bg-deep text-paper font-sans text-xs hover:bg-forest transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap"
            >
              插入
            </button>
          </div>

          {mediaError && <p className="font-sans text-[10px] text-red-500">{mediaError}</p>}
        </div>

        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageInsert} />

        <textarea
          ref={contentRef}
          rows={22}
          value={data.content}
          onChange={set("content")}
          placeholder="在此撰寫文章內容，支援 Markdown（## 標題、**粗體**、1. 清單等）&#10;&#10;圖片、IG、YouTube 可透過上方工具插入。"
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
