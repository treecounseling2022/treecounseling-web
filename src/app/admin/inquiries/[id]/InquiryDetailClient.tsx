"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Inquiry = {
  id: string;
  service_type: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  preferred_times: string | null;
  concern: string | null;
  form_data: Record<string, unknown>;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

type Therapist = { id: string; name: string };
type Room = { id: string; name: string };

const SERVICE_LABEL: Record<string, string> = {
  individual: "個人心理輔導",
  couple: "伴侶心理輔導",
  hoarding: "囤積者查詢",
  workshop: "講座 / 工作坊",
  proposal: "方案與計劃",
  other: "其他查詢",
};

const STATUS_LABEL: Record<string, string> = {
  new: "新申請",
  contacted: "已聯繫",
  converted: "已轉個案",
  closed: "已關閉",
};

const STATUS_CLS: Record<string, string> = {
  new: "bg-amber-50 text-amber-700",
  contacted: "bg-blue-50 text-blue-700",
  converted: "bg-green-50 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function FormDataDisplay({ data }: { data: Record<string, unknown> }) {
  const skip = new Set(["serviceType", "name", "email", "phone", "preferredTimes", "concern"]);
  const extra = Object.entries(data).filter(([k]) => !skip.has(k));

  const renderValue = (v: unknown): string => {
    if (v === null || v === undefined) return "—";
    if (typeof v === "string") return v || "—";
    if (Array.isArray(v)) return v.join("、") || "—";
    if (typeof v === "object") return JSON.stringify(v, null, 2);
    return String(v);
  };

  if (extra.length === 0) return null;

  return (
    <div className="space-y-2">
      {extra.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[160px_1fr] gap-2 text-xs">
          <span className="font-sans text-muted/60 pt-0.5">{k}</span>
          <span className="font-sans text-deep whitespace-pre-wrap">{renderValue(v)}</span>
        </div>
      ))}
    </div>
  );
}

export default function InquiryDetailClient({
  inquiry,
  therapists,
  rooms,
}: {
  inquiry: Inquiry;
  therapists: Therapist[];
  rooms: Room[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(inquiry.admin_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({
    therapist_id: "",
    room_id: "",
    scheduled_at: "",
    session_fee: "",
  });
  const [assigning, setAssigning] = useState(false);
  const [assignErr, setAssignErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [driveUrl, setDriveUrl] = useState("");
  const [driveErr, setDriveErr] = useState("");

  async function saveNotes() {
    setSaving(true);
    await fetch("/api/admin/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: inquiry.id, admin_notes: notes }),
    });
    setSaving(false);
  }

  async function updateStatus(status: string) {
    setSaving(true);
    await fetch("/api/admin/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: inquiry.id, status }),
    });
    setSaving(false);
    router.refresh();
  }

  async function doAssign() {
    if (!assignForm.therapist_id) { setAssignErr("請選擇心理師"); return; }
    setAssigning(true);
    setAssignErr("");
    const res = await fetch(`/api/admin/inquiries/${inquiry.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        therapist_id: assignForm.therapist_id,
        room_id: assignForm.room_id || undefined,
        scheduled_at: assignForm.scheduled_at || undefined,
        session_fee: assignForm.session_fee ? Number(assignForm.session_fee) : undefined,
      }),
    });
    const data = await res.json();
    setAssigning(false);
    if (!res.ok) { setAssignErr(data.error ?? "派案失敗"); return; }
    setShowAssign(false);
    router.refresh();
  }

  async function uploadToDrive() {
    setUploading(true);
    setDriveErr("");
    setDriveUrl("");

    const html = buildHTMLContent(inquiry, notes);
    const blob = new Blob([html], { type: "text/html; charset=utf-8" });
    const file = new File([blob], `申請_${inquiry.name ?? inquiry.id}.html`);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("filename", file.name);

    const res = await fetch("/api/admin/drive-upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { setDriveErr(data.error ?? "上傳失敗"); return; }
    setDriveUrl(data.url);
  }

  const canAssign = inquiry.status !== "converted" && inquiry.status !== "closed";

  return (
    <div className="space-y-6 pt-4 max-w-3xl">
      {/* Breadcrumb */}
      <div>
        <p className="font-sans text-xs text-muted mb-1">
          <a href="/admin" className="hover:text-forest">後台</a>
          {" / "}
          <a href="/admin/inquiries" className="hover:text-forest">預約申請</a>
          {" / "}
          {inquiry.name ?? inquiry.id.slice(0, 8)}
        </p>
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-deep text-2xl">{inquiry.name ?? "（未填姓名）"}</h1>
          <span className={`font-sans text-[11px] px-2 py-0.5 ${STATUS_CLS[inquiry.status]}`}>
            {STATUS_LABEL[inquiry.status] ?? inquiry.status}
          </span>
        </div>
        <p className="font-sans text-xs text-muted mt-0.5">
          申請於 {fmtDate(inquiry.created_at)}
        </p>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        {canAssign && (
          <button
            onClick={() => setShowAssign(true)}
            className="font-sans text-xs px-4 py-2 bg-deep text-paper hover:bg-forest transition-colors"
          >
            派案 →
          </button>
        )}
        <a
          href={`/admin/inquiries/${inquiry.id}/print`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-sans text-xs px-4 py-2 border border-sand/40 text-muted hover:text-deep transition-colors"
        >
          列印 / 匯出 PDF
        </a>
        <button
          onClick={uploadToDrive}
          disabled={uploading}
          className="font-sans text-xs px-4 py-2 border border-sand/40 text-muted hover:text-deep disabled:opacity-40 transition-colors"
        >
          {uploading ? "上傳中…" : "儲存到 Google Drive"}
        </button>
        {driveUrl && (
          <a
            href={driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-xs px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
          >
            在 Drive 開啟 ↗
          </a>
        )}
        {driveErr && (
          <p className="font-sans text-xs text-red-500 self-center">{driveErr}</p>
        )}
      </div>

      {/* Basic info */}
      <section className="bg-white border border-sand/20 p-5 space-y-3">
        <h2 className="font-serif text-deep text-base border-b border-sand/10 pb-2">基本資料</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 font-sans text-sm">
          <div>
            <span className="text-muted/60 text-xs block">服務類型</span>
            <span className="text-deep">{SERVICE_LABEL[inquiry.service_type] ?? inquiry.service_type}</span>
          </div>
          <div>
            <span className="text-muted/60 text-xs block">姓名</span>
            <span className="text-deep">{inquiry.name ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted/60 text-xs block">Email</span>
            <span className="text-deep">{inquiry.email ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted/60 text-xs block">電話</span>
            <span className="text-deep">{inquiry.phone ?? "—"}</span>
          </div>
          {inquiry.preferred_times && (
            <div className="col-span-2">
              <span className="text-muted/60 text-xs block">偏好時段</span>
              <span className="text-deep">{inquiry.preferred_times}</span>
            </div>
          )}
        </div>
      </section>

      {/* AI conversation / concern */}
      {inquiry.concern && (
        <section className="bg-white border border-sand/20 p-5 space-y-3">
          <h2 className="font-serif text-deep text-base border-b border-sand/10 pb-2">困擾說明與 AI 對話摘要</h2>
          <p className="font-sans text-sm text-deep leading-relaxed whitespace-pre-wrap bg-sand/5 px-4 py-3 border-l-2 border-forest/30">
            {inquiry.concern}
          </p>
        </section>
      )}

      {/* Extra form data */}
      {inquiry.form_data && Object.keys(inquiry.form_data).length > 0 && (
        <section className="bg-white border border-sand/20 p-5 space-y-3">
          <h2 className="font-serif text-deep text-base border-b border-sand/10 pb-2">詳細表單資料</h2>
          <FormDataDisplay data={inquiry.form_data} />
          <details className="mt-2">
            <summary className="font-sans text-[11px] text-muted/50 cursor-pointer hover:text-muted">
              查看原始 JSON ▸
            </summary>
            <pre className="mt-2 font-mono text-[10px] text-muted/60 bg-sand/10 p-3 overflow-x-auto whitespace-pre-wrap break-all rounded">
              {JSON.stringify(inquiry.form_data, null, 2)}
            </pre>
          </details>
        </section>
      )}

      {/* Admin notes */}
      <section className="bg-white border border-sand/20 p-5 space-y-3">
        <h2 className="font-serif text-deep text-base border-b border-sand/10 pb-2">行政備註</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50 resize-none"
          placeholder="記錄聯繫狀況、備忘、評估意見…"
        />
        <div className="flex gap-2">
          <button
            onClick={saveNotes}
            disabled={saving}
            className="font-sans text-xs px-4 py-2 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors"
          >
            {saving ? "儲存中…" : "儲存備註"}
          </button>
          {inquiry.status === "new" && (
            <button
              onClick={() => updateStatus("contacted")}
              disabled={saving}
              className="font-sans text-xs px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              標記已聯繫
            </button>
          )}
          {inquiry.status !== "converted" && inquiry.status !== "closed" && (
            <button
              onClick={() => updateStatus("closed")}
              disabled={saving}
              className="font-sans text-xs px-4 py-2 text-muted/50 hover:text-red-400 ml-auto transition-colors"
            >
              關閉申請
            </button>
          )}
        </div>
      </section>

      {/* Assign modal */}
      {showAssign && (
        <div
          className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAssign(false)}
        >
          <div
            className="bg-white p-6 w-full max-w-md space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-deep text-lg">派案</h2>
            <p className="font-sans text-xs text-muted">
              指定心理師後系統將通知心理師確認。時間與診室可先略填，由心理師確認後補全。
            </p>

            <div className="space-y-3">
              <div>
                <label className="font-sans text-xs text-muted block mb-1">心理師 *</label>
                <select
                  value={assignForm.therapist_id}
                  onChange={(e) => setAssignForm((f) => ({ ...f, therapist_id: e.target.value }))}
                  className="w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50 bg-white"
                >
                  <option value="">— 請選擇 —</option>
                  {therapists.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-sans text-xs text-muted block mb-1">診室（選填）</label>
                <select
                  value={assignForm.room_id}
                  onChange={(e) => setAssignForm((f) => ({ ...f, room_id: e.target.value }))}
                  className="w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50 bg-white"
                >
                  <option value="">— 待定 —</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-sans text-xs text-muted block mb-1">預計時間（選填）</label>
                <input
                  type="datetime-local"
                  value={assignForm.scheduled_at}
                  onChange={(e) => setAssignForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                  className="w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50"
                />
              </div>

              <div>
                <label className="font-sans text-xs text-muted block mb-1">收費（MOP，選填）</label>
                <input
                  type="number"
                  value={assignForm.session_fee}
                  onChange={(e) => setAssignForm((f) => ({ ...f, session_fee: e.target.value }))}
                  placeholder="例：600"
                  className="w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50"
                />
              </div>
            </div>

            {assignErr && (
              <p className="font-sans text-xs text-red-500">{assignErr}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={doAssign}
                disabled={assigning}
                className="font-sans text-xs px-5 py-2 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors"
              >
                {assigning ? "派案中…" : "確認派案"}
              </button>
              <button
                onClick={() => setShowAssign(false)}
                className="font-sans text-xs px-4 py-2 border border-sand/30 text-muted hover:text-deep transition-colors ml-auto"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildHTMLContent(inquiry: Inquiry, adminNotes: string): string {
  const fmt = (v: unknown): string => {
    if (v == null) return "—";
    if (typeof v === "string") return v || "—";
    if (Array.isArray(v)) return v.join("、");
    return JSON.stringify(v);
  };

  const rows = Object.entries(inquiry.form_data)
    .map(([k, v]) => `<tr><td style="color:#888;padding:4px 12px 4px 0;vertical-align:top">${k}</td><td style="padding:4px 0;white-space:pre-wrap">${fmt(v)}</td></tr>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="utf-8"><title>申請記錄 — ${inquiry.name ?? "未知"}</title>
<style>body{font-family:sans-serif;max-width:720px;margin:40px auto;color:#333;line-height:1.6}
h1{font-size:1.4rem;margin-bottom:4px}h2{font-size:1rem;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:24px}
.meta{color:#888;font-size:.85rem}.concern{background:#f7f5f0;padding:12px 16px;white-space:pre-wrap;border-left:3px solid #5a8a6a}
table{width:100%;border-collapse:collapse;font-size:.9rem}</style></head>
<body>
<h1>${inquiry.name ?? "（未填姓名）"}</h1>
<p class="meta">申請時間：${new Date(inquiry.created_at).toLocaleString("zh-TW")} ｜ 狀態：${inquiry.status} ｜ 服務：${inquiry.service_type}</p>

<h2>基本資料</h2>
<table>
<tr><td style="color:#888;padding:4px 12px 4px 0">Email</td><td>${inquiry.email ?? "—"}</td></tr>
<tr><td style="color:#888;padding:4px 12px 4px 0">電話</td><td>${inquiry.phone ?? "—"}</td></tr>
<tr><td style="color:#888;padding:4px 12px 4px 0">偏好時段</td><td>${inquiry.preferred_times ?? "—"}</td></tr>
</table>

${inquiry.concern ? `<h2>困擾說明與 AI 對話摘要</h2><div class="concern">${inquiry.concern.replace(/</g, "&lt;")}</div>` : ""}

${rows ? `<h2>詳細表單資料</h2><table>${rows}</table>` : ""}

${adminNotes ? `<h2>行政備註</h2><p>${adminNotes.replace(/</g, "&lt;")}</p>` : ""}

<p class="meta" style="margin-top:40px;font-size:.75rem">匯出自 樹心理後台 · ${new Date().toLocaleString("zh-TW")}</p>
</body></html>`;
}
