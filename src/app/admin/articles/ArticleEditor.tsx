"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import TiptapImage from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Node, Extension, mergeAttributes } from "@tiptap/core";

// Custom font-size extension (requires TextStyle)
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() { return { types: ["textStyle"] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontSize?.replace(/['"]+/g, "") || null,
          renderHTML: (attrs: Record<string, string | null>) => {
            if (!attrs.fontSize) return {};
            return { style: `font-size: ${attrs.fontSize}` };
          },
        },
      },
    }];
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addCommands(): Record<string, (...args: any[]) => any> {
    return {
      setFontSize: (fontSize: string) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ chain }: { chain: () => any }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize: () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ chain }: { chain: () => any }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

// Custom iframe node for YouTube / Instagram embeds
const IframeNode = Node.create({
  name: "iframe",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      width: { default: "100%" },
      height: { default: "315" },
      frameborder: { default: "0" },
      allowfullscreen: { default: "true" },
      scrolling: { default: null },
      allowtransparency: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "iframe[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["iframe", mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ({ node }) => {
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "text-align:center;margin:1rem 0;";
      const iframe = document.createElement("iframe");
      Object.entries(node.attrs).forEach(([k, v]) => {
        if (v != null) iframe.setAttribute(k, String(v));
      });
      iframe.style.cssText = "max-width:100%;border:0;";
      wrapper.appendChild(iframe);
      return { dom: wrapper };
    };
  },
});

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
  const [showMedia, setShowMedia] = useState(false);
  const [error, setError] = useState("");
  const [therapists, setTherapists] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (lockedAuthor) return;
    fetch("/api/admin/therapists")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { id: string; name: string }[]) => setTherapists(list))
      .catch(() => {});
  }, [lockedAuthor]);

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

  // File input refs
  const coverInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof ArticleData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setData((p) => ({ ...p, [field]: e.target.value }));

  // TipTap editor
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TiptapImage.configure({ inline: false }),
      Placeholder.configure({ placeholder: "在此撰寫文章內容…\n點擊即可開始輸入，使用上方工具列格式化文字" }),
      TextStyle,
      FontSize,
      IframeNode,
    ],
    content: initialData.content || "",
    onUpdate({ editor }) {
      setData((p) => ({ ...p, content: editor.getHTML() }));
    },
    editorProps: {
      attributes: { class: "tiptap-editor-content" },
    },
  });

  // Sync editor content if initialData changes (e.g. page refresh)
  useEffect(() => {
    if (editor && initialData.content && editor.isEmpty) {
      editor.commands.setContent(initialData.content);
    }
  }, [editor, initialData.content]);

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

  // Content image insert via TipTap
  const handleImageInsert = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    setMediaError("");
    const url = await uploadImage(file, "content");
    if (url && editor) {
      editor.chain().focus().setImage({ src: url, alt: file.name.replace(/\.[^.]+$/, "") }).run();
    }
    setImageUploading(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // IG: auto-fetch caption
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
      if (!res.ok) { setMediaError(result.error ?? "擷取失敗"); return; }
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

  // IG: insert embed iframe via TipTap
  const handleIgInsert = () => {
    if (!igUrl.trim() || !editor) return;
    setMediaError("");
    const scMatch = igUrl.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    if (!scMatch) { setMediaError("無法識別 Instagram 貼文連結"); return; }
    const shortcode = scMatch[1];
    if (igCaption.trim()) {
      editor.chain().focus().insertContent(`<p><em>${igCaption.trim()}</em></p>`).run();
    }
    editor.chain().focus().insertContent({
      type: "iframe",
      attrs: {
        src: `https://www.instagram.com/p/${shortcode}/embed`,
        width: "400",
        height: "480",
        frameborder: "0",
        scrolling: "no",
        allowtransparency: "true",
      },
    }).run();
    setIgUrl(""); setIgCaption(""); setIgAuthor(""); setIgFetchStatus("idle");
  };

  // YouTube embed insert via TipTap
  const handleYtInsert = () => {
    if (!ytUrl.trim() || !editor) return;
    setMediaError("");
    const videoId = extractYouTubeId(ytUrl.trim());
    if (!videoId) { setMediaError("無法識別 YouTube 連結，請確認格式正確"); return; }
    editor.chain().focus().insertContent({
      type: "iframe",
      attrs: {
        src: `https://www.youtube.com/embed/${videoId}`,
        width: "560",
        height: "315",
        frameborder: "0",
        allowfullscreen: "true",
      },
    }).run();
    setYtUrl("");
  };

  const handleSave = async (publish?: boolean) => {
    const content = editor ? editor.getHTML() : data.content;
    if (!data.title.trim() || !content.trim() || content === "<p></p>") {
      setError("標題和內容不可為空");
      return;
    }
    setError("");
    setSaving(true);

    const payload = {
      ...data,
      content,
      ...(publish !== undefined ? { published: publish } : {}),
    };

    const supabase = createClient();
    const { error: dbErr } = isNew
      ? await supabase.from("articles").insert(payload)
      : await supabase.from("articles").update(payload).eq("id", data.id);

    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
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

  if (!editor) return null;

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
                {therapists.map((m) => <option key={m.id}>{m.name}</option>)}
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

      {/* 文章內容 — TipTap */}
      <div className="bg-white border border-sand/15">
        {/* Section header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-sand/15">
          <h2 className="font-serif text-deep text-base">文章內容 *</h2>
          <button
            type="button"
            onClick={() => setShowMedia((v) => !v)}
            className="font-sans text-xs text-muted hover:text-forest transition-colors cursor-pointer"
          >
            {showMedia ? "▲" : "▼"} 插入圖片 / 多媒體
          </button>
        </div>

        {/* 多媒體工具（預設收合） */}
        {showMedia && (
          <div className="bg-sand/5 border-b border-sand/20 px-6 py-3 space-y-3">
            <p className="font-sans text-[10px] text-muted/50 tracking-wide uppercase">插入多媒體</p>

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

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-sans text-[11px] text-deep/60 w-14 flex-shrink-0">IG 貼文</span>
                <input
                  value={igUrl}
                  onChange={(e) => { setIgUrl(e.target.value); setIgCaption(""); setIgAuthor(""); setIgFetchStatus("idle"); }}
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
              {igUrlTrimmed && (
                <div className="ml-16 space-y-1">
                  {igFetchStatus === "found" && <p className="font-sans text-[10px] text-forest">{igAuthor ? `@${igAuthor} · ` : ""}已自動擷取說明文字，可自行編輯</p>}
                  {igFetchStatus === "notfound" && <p className="font-sans text-[10px] text-muted/50">未能自動擷取，可手動貼上說明文字（或留空直接插入貼文）</p>}
                  {igFetchStatus === "idle" && <p className="font-sans text-[10px] text-muted/40">可點「擷取說明」自動取得文字，或直接手動填寫</p>}
                  <textarea rows={3} value={igCaption} onChange={(e) => setIgCaption(e.target.value)} placeholder="說明文字（選填）" className={cn(inputCls, "text-xs py-1.5 resize-none")} />
                </div>
              )}
            </div>

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
        )}

        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageInsert} />

        {/* TipTap 工具列 */}
        <div className="tiptap-editor border-b border-sand/15">
          <div className="flex items-center gap-0.5 flex-wrap bg-sand/5 px-3 py-2 border-b border-sand/15">
            {/* Font size */}
            <select
              value={editor.getAttributes("textStyle").fontSize ?? ""}
              onChange={(e) => {
                const size = e.target.value;
                if (!size) (editor.chain().focus() as any).unsetFontSize().run();
                else (editor.chain().focus() as any).setFontSize(size).run();
              }}
              className="border border-sand/25 bg-white px-2 py-1 font-sans text-xs text-muted focus:outline-none focus:border-forest cursor-pointer"
              title="字號大小"
            >
              <option value="">字號</option>
              <option value="12px">12px 小</option>
              <option value="14px">14px</option>
              <option value="16px">16px 預設</option>
              <option value="18px">18px</option>
              <option value="20px">20px</option>
              <option value="24px">24px 大</option>
              <option value="28px">28px</option>
              <option value="32px">32px 超大</option>
            </select>
            <Sep />
            {/* Heading */}
            <TipBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="大標題">H1</TipBtn>
            <TipBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="中標題">H2</TipBtn>
            <TipBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="小標題">H3</TipBtn>
            <TipBtn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")} title="正文">正文</TipBtn>
            <Sep />
            {/* Inline formatting */}
            <TipBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="粗體"><strong>B</strong></TipBtn>
            <TipBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="斜體"><em>I</em></TipBtn>
            <TipBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="底線"><u>U</u></TipBtn>
            <TipBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="刪除線"><s>S</s></TipBtn>
            <Sep />
            {/* Alignment */}
            <TipBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="靠左">≡</TipBtn>
            <TipBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="置中">≡̈</TipBtn>
            <TipBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="靠右">≡͆</TipBtn>
            <Sep />
            {/* Lists */}
            <TipBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="項目清單">• 清單</TipBtn>
            <TipBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="數字清單">1. 序號</TipBtn>
            <Sep />
            {/* Block */}
            <TipBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="引用">引用</TipBtn>
            <TipBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="分隔線">───</TipBtn>
            <Sep />
            {/* Link */}
            <TipBtn
              onClick={() => {
                if (editor.isActive("link")) {
                  editor.chain().focus().unsetLink().run();
                } else {
                  const url = window.prompt("請輸入連結網址：");
                  if (url) editor.chain().focus().setLink({ href: url, target: "_blank" }).run();
                }
              }}
              active={editor.isActive("link")}
              title="插入連結"
            >
              🔗 連結
            </TipBtn>
            <Sep />
            {/* Undo / Redo */}
            <TipBtn onClick={() => editor.chain().focus().undo().run()} title="復原">↩ 復原</TipBtn>
            <TipBtn onClick={() => editor.chain().focus().redo().run()} title="重做">↪ 重做</TipBtn>
          </div>

          {/* Editor area */}
          <EditorContent editor={editor} className="tiptap-editor" />
        </div>
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

function Sep() {
  return <div className="w-px h-4 bg-sand/30 mx-0.5 flex-shrink-0" />;
}

function TipBtn({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "px-2.5 py-1.5 font-sans text-xs transition-all rounded cursor-pointer whitespace-nowrap select-none border",
        active
          ? "bg-deep text-paper border-deep"
          : "text-muted hover:text-deep bg-transparent hover:bg-white border-transparent hover:border-sand/25"
      )}
    >
      {children}
    </button>
  );
}

const labelCls = "block font-sans text-xs text-deep/80";
const inputCls =
  "w-full border border-sand/25 bg-soft/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest transition-colors";
