"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTherapistForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [title, setTitle] = useState("");
  const [id, setId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function suggestId(en: string) {
    return en.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");
  }

  function handleNameEnChange(val: string) {
    setNameEn(val);
    if (!id || id === suggestId(nameEn)) {
      setId(suggestId(val));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !id.trim()) return;
    setSaving(true);
    setError("");

    const res = await fetch("/api/admin/therapists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id.trim(), name: name.trim(), name_en: nameEn.trim() || undefined, title: title.trim() || undefined }),
    });
    const data = await res.json();

    if (data.success) {
      router.push(`/admin/members/${data.id}`);
    } else {
      setError(data.error ?? "建立失敗，請稍後再試");
      setSaving(false);
    }
  }

  const inputCls = "w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50";
  const labelCls = "font-sans text-[11px] text-muted block mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
      <div>
        <label className={labelCls}>中文姓名 <span className="text-red-400">*</span></label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="例：陳大文" required />
      </div>

      <div>
        <label className={labelCls}>英文名 / 拼音</label>
        <input value={nameEn} onChange={(e) => handleNameEnChange(e.target.value)} className={inputCls} placeholder="例：David Chen" />
      </div>

      <div>
        <label className={labelCls}>職稱</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="例：心理輔導師" />
      </div>

      <div>
        <label className={labelCls}>
          系統 ID <span className="text-red-400">*</span>
          <span className="ml-1 text-muted/50">（唯一識別碼，建立後不可更改）</span>
        </label>
        <input
          value={id}
          onChange={(e) => setId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
          className={inputCls}
          placeholder="例：david_chen"
          required
        />
        <p className="font-sans text-[10px] text-muted/50 mt-1">只能使用小寫英文、數字、底線、連字號</p>
      </div>

      {error && (
        <p className="font-sans text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</p>
      )}

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={saving || !name.trim() || !id.trim()}
          className="font-sans text-xs px-6 py-2.5 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors"
        >
          {saving ? "建立中…" : "建立心理師"}
        </button>
        <a href="/admin/members" className="font-sans text-xs text-muted hover:text-deep transition-colors">
          取消
        </a>
      </div>
    </form>
  );
}
