"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REASON_OPTIONS = [
  { value: "completed",   label: "目標達成，正式結案" },
  { value: "transferred", label: "轉介其他機構/心理師" },
  { value: "dropped",     label: "個案中途退出" },
  { value: "other",       label: "其他原因" },
];

const GOAL_OPTIONS = [
  { value: "full",    label: "完全達成" },
  { value: "partial", label: "部分達成" },
  { value: "none",    label: "未達成" },
];

export default function CaseClosurePanel({
  clientId,
  clientName,
  isClosed,
  closedAt,
}: {
  clientId: string;
  clientName: string;
  isClosed: boolean;
  closedAt: string | null;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    closure_reason: "",
    session_count: "",
    goal_achieved: "",
    summary: "",
    admin_note: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submitClosure() {
    if (!form.closure_reason) { setErr("請選擇結案原因"); return; }
    setSaving(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "close_case",
          closure_reason: form.closure_reason,
          session_count: form.session_count ? parseInt(form.session_count) : null,
          goal_achieved: form.goal_achieved || null,
          summary: form.summary || null,
          admin_note: form.admin_note || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "結案失敗"); return; }
      router.refresh();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function reopenCase() {
    if (!confirm(`確定重新開案「${clientName}」？`)) return;
    const res = await fetch(`/api/admin/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reopen_case" }),
    });
    if (res.ok) router.refresh();
  }

  const inputCls = "w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50";

  if (isClosed) {
    return (
      <div className="bg-gray-50 border border-sand/20 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-sans text-xs font-medium text-muted">個案已結案</p>
          {closedAt && (
            <p className="font-sans text-[11px] text-muted/60 mt-0.5">
              結案於 {new Date(closedAt).toLocaleDateString("zh-TW")}
            </p>
          )}
        </div>
        <button
          onClick={reopenCase}
          className="font-sans text-[11px] px-3 py-1.5 border border-sand/40 text-muted hover:bg-sand/10 transition-colors"
        >
          重新開案
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!showForm ? (
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="font-sans text-xs px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            結案 →
          </button>
        </div>
      ) : (
        <div className="border border-red-100 bg-red-50/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-deep text-base">結案評估</h3>
            <button
              onClick={() => { setShowForm(false); setErr(""); }}
              className="font-sans text-[11px] text-muted/60 hover:text-muted"
            >
              取消
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="font-sans text-[11px] text-muted block mb-1">結案原因 *</label>
              <select
                value={form.closure_reason}
                onChange={(e) => setForm((f) => ({ ...f, closure_reason: e.target.value }))}
                className={inputCls}
              >
                <option value="">請選擇…</option>
                {REASON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">總晤談次數</label>
                <input
                  type="number"
                  min="0"
                  value={form.session_count}
                  onChange={(e) => setForm((f) => ({ ...f, session_count: e.target.value }))}
                  className={inputCls}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">目標達成程度</label>
                <select
                  value={form.goal_achieved}
                  onChange={(e) => setForm((f) => ({ ...f, goal_achieved: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">（選填）</option>
                  {GOAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="font-sans text-[11px] text-muted block mb-1">結案摘要（選填）</label>
              <textarea
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                rows={3}
                className={inputCls + " resize-none"}
                placeholder="個案整體狀況、主要進展、建議事項…"
              />
            </div>

            <div>
              <label className="font-sans text-[11px] text-muted block mb-1">行政備註（選填）</label>
              <input
                value={form.admin_note}
                onChange={(e) => setForm((f) => ({ ...f, admin_note: e.target.value }))}
                className={inputCls}
                placeholder="如：已退回相關資料"
              />
            </div>
          </div>

          {err && <p className="font-sans text-xs text-red-500">{err}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={submitClosure}
              disabled={saving}
              className="font-sans text-sm px-6 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
            >
              {saving ? "結案中…" : "確認結案"}
            </button>
            <p className="font-sans text-[11px] text-muted/50 self-center">結案後個案將設為不活躍狀態。</p>
          </div>
        </div>
      )}
    </div>
  );
}
