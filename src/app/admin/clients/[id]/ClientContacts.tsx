"use client";

import { useState } from "react";

type Contact = {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_email?: string | null;
};

export default function ClientContacts({
  clientId,
  initialContacts,
  currentUserId,
  isDirector,
}: {
  clientId: string;
  initialContacts: Contact[];
  currentUserId: string;
  isDirector: boolean;
}) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function addContact() {
    if (!newText.trim()) return;
    setAdding(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/client-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, content: newText }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "新增失敗"); return; }
      setContacts((prev) => [{ ...data, creator_email: null }, ...prev]);
      setNewText("");
    } finally {
      setAdding(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return;
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/client-contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, content: editText }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "修改失敗"); return; }
      setContacts((prev) => prev.map((c) => c.id === id ? { ...c, content: data.content, updated_at: data.updated_at } : c));
      setEditId(null);
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact(id: string) {
    if (!confirm("確定刪除這筆聯繫紀錄？")) return;
    const res = await fetch(`/api/admin/client-contacts?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } else {
      const data = await res.json();
      setErr(data.error ?? "刪除失敗");
    }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString("zh-TW", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  const inputCls = "w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50";

  return (
    <div className="space-y-3">
      <h2 className="font-serif text-deep text-lg">聯繫紀錄</h2>

      {/* New contact input */}
      <div className="space-y-2">
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          rows={2}
          placeholder="記錄本次聯繫內容…"
          className={inputCls + " resize-none"}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addContact();
          }}
        />
        {err && <p className="font-sans text-xs text-red-500">{err}</p>}
        <div className="flex justify-end">
          <button
            onClick={addContact}
            disabled={adding || !newText.trim()}
            className="font-sans text-xs px-4 py-1.5 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors"
          >
            {adding ? "新增中…" : "+ 新增紀錄"}
          </button>
        </div>
      </div>

      {/* Contact list */}
      {contacts.length === 0 ? (
        <p className="font-sans text-xs text-muted/40 py-2">尚無聯繫紀錄。</p>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => {
            const canEdit = c.created_by === currentUserId || isDirector;
            const isEditing = editId === c.id;
            const wasEdited = c.updated_at !== c.created_at;

            return (
              <div key={c.id} className="bg-white border border-sand/20 px-4 py-3 space-y-2">
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className={inputCls + " resize-none"}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(c.id)}
                        disabled={saving}
                        className="font-sans text-xs px-3 py-1 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors"
                      >
                        {saving ? "儲存中…" : "儲存"}
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="font-sans text-xs px-3 py-1 border border-sand/30 text-muted hover:bg-sand/10 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="font-sans text-sm text-deep whitespace-pre-wrap leading-relaxed">{c.content}</p>
                )}

                <div className="flex items-center justify-between">
                  <p className="font-sans text-[10px] text-muted/50">
                    {fmtDate(c.created_at)}
                    {wasEdited && <span className="ml-1 italic">（已修改）</span>}
                  </p>
                  {canEdit && !isEditing && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setEditId(c.id); setEditText(c.content); setErr(""); }}
                        className="font-sans text-[10px] text-muted/60 hover:text-deep transition-colors"
                      >
                        修改
                      </button>
                      <button
                        onClick={() => deleteContact(c.id)}
                        className="font-sans text-[10px] text-red-400 hover:text-red-600 transition-colors"
                      >
                        刪除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="font-sans text-[10px] text-muted/40">聯繫紀錄僅填寫人及院長可修改。</p>
    </div>
  );
}
