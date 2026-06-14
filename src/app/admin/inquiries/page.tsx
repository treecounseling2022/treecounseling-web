"use client";

import { useState, useEffect, useCallback } from "react";

type Inquiry = {
  id: string;
  service_type: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  preferred_times: string | null;
  concern: string | null;
  form_data: Record<string, unknown>;
  status: "new" | "contacted" | "converted" | "closed";
  admin_notes: string | null;
  created_at: string;
};

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
  closed: "bg-gray-100 text-gray-400",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [filter, setFilter] = useState<string>("new");
  const [detail, setDetail] = useState<Inquiry | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/inquiries");
    if (res.ok) setInquiries(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "all"
    ? inquiries
    : inquiries.filter((i) => i.status === filter);

  async function updateStatus(id: string, status: string, admin_notes?: string) {
    setSaving(true);
    await fetch("/api/admin/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, admin_notes }),
    });
    await load();
    setSaving(false);
    if (detail?.id === id) setDetail(null);
  }

  async function saveNotes(id: string) {
    setSaving(true);
    await fetch("/api/admin/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, admin_notes: notes }),
    });
    await load();
    setSaving(false);
  }

  const counts = {
    new: inquiries.filter((i) => i.status === "new").length,
    contacted: inquiries.filter((i) => i.status === "contacted").length,
    converted: inquiries.filter((i) => i.status === "converted").length,
    closed: inquiries.filter((i) => i.status === "closed").length,
  };

  return (
    <div className="space-y-6 pt-4">
      <div>
        <p className="font-sans text-xs text-muted mb-1">
          <a href="/admin" className="hover:text-forest">後台</a> / 預約申請佇列
        </p>
        <h1 className="font-serif text-deep text-2xl">預約申請佇列</h1>
        <p className="font-sans text-xs text-muted mt-0.5">
          來自公開預約表單的申請，處理後再建立個案與正式預約。
        </p>
      </div>

      {/* Filter tabs */}
      <div className="border-b border-sand/20">
        <div className="flex gap-0">
          {[
            { key: "new", label: `新申請 (${counts.new})` },
            { key: "contacted", label: `已聯繫 (${counts.contacted})` },
            { key: "converted", label: `已轉個案 (${counts.converted})` },
            { key: "closed", label: `已關閉 (${counts.closed})` },
            { key: "all", label: `全部 (${inquiries.length})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`font-sans text-xs px-5 py-2.5 border-b-2 -mb-px transition-colors ${
                filter === t.key
                  ? "border-deep text-deep font-medium"
                  : "border-transparent text-muted hover:text-deep"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((inq) => (
          <div key={inq.id} className="bg-white border border-sand/20 p-4 space-y-3 hover:border-sand/40 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-serif text-deep">{inq.name ?? "（未填姓名）"}</p>
                <p className="font-sans text-[11px] text-sand mt-0.5">
                  {SERVICE_LABEL[inq.service_type] ?? inq.service_type}
                </p>
              </div>
              <span className={`font-sans text-[10px] px-2 py-0.5 flex-shrink-0 ${STATUS_CLS[inq.status]}`}>
                {STATUS_LABEL[inq.status]}
              </span>
            </div>

            <div className="font-sans text-[11px] text-muted space-y-0.5">
              {inq.email && <p>Email：{inq.email}</p>}
              {inq.phone && <p>電話：{inq.phone}</p>}
              <p className="text-muted/40">申請於 {fmtDate(inq.created_at)}</p>
            </div>

            {inq.concern && (
              <p className="font-sans text-xs text-muted leading-relaxed line-clamp-2 bg-sand/10 px-3 py-2">
                {inq.concern}
              </p>
            )}

            {inq.admin_notes && (
              <p className="font-sans text-[11px] text-forest/70 bg-forest/5 px-3 py-1.5">
                備註：{inq.admin_notes}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <a
                href={`/admin/inquiries/${inq.id}`}
                className="font-sans text-[11px] px-3 py-1.5 border border-sand/30 text-muted hover:text-deep transition-colors"
              >
                查看詳情
              </a>
              <button
                onClick={() => { setDetail(inq); setNotes(inq.admin_notes ?? ""); }}
                className="font-sans text-[11px] px-3 py-1.5 border border-sand/30 text-muted hover:text-deep transition-colors"
              >
                快速備註
              </button>
              {inq.status === "new" && (
                <button
                  onClick={() => updateStatus(inq.id, "contacted")}
                  disabled={saving}
                  className="font-sans text-[11px] px-3 py-1.5 bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
                >
                  標記已聯繫
                </button>
              )}
              {inq.status === "contacted" && (
                <button
                  onClick={() => updateStatus(inq.id, "converted")}
                  disabled={saving}
                  className="font-sans text-[11px] px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
                >
                  已轉個案
                </button>
              )}
              {inq.status !== "closed" && inq.status !== "converted" && (
                <button
                  onClick={() => updateStatus(inq.id, "closed")}
                  disabled={saving}
                  className="font-sans text-[11px] px-3 py-1.5 text-muted/50 hover:text-red-400 transition-colors ml-auto"
                >
                  關閉
                </button>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-16 font-sans text-xs text-muted/40">
            此分類目前沒有申請。
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detail && (
        <div
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white p-6 w-full max-w-lg space-y-4 shadow-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-deep text-lg">{detail.name ?? "申請詳情"}</h2>
              <span className={`font-sans text-[10px] px-2 py-0.5 ${STATUS_CLS[detail.status]}`}>
                {STATUS_LABEL[detail.status]}
              </span>
            </div>

            <div className="font-sans text-xs text-muted space-y-1">
              <p>服務類型：{SERVICE_LABEL[detail.service_type] ?? detail.service_type}</p>
              {detail.email && <p>Email：{detail.email}</p>}
              {detail.phone && <p>電話：{detail.phone}</p>}
              {detail.preferred_times && <p>偏好時段：{detail.preferred_times}</p>}
              <p className="text-muted/40">申請時間：{fmtDate(detail.created_at)}</p>
            </div>

            {detail.concern && (
              <div>
                <p className="font-sans text-[11px] text-muted mb-1">困擾說明</p>
                <p className="font-sans text-xs text-deep bg-sand/10 px-3 py-2 leading-relaxed whitespace-pre-wrap">
                  {detail.concern}
                </p>
              </div>
            )}

            {/* 完整表單資料 */}
            <details className="group">
              <summary className="font-sans text-[11px] text-muted/60 cursor-pointer hover:text-muted">
                查看完整表單資料 ▸
              </summary>
              <pre className="mt-2 font-mono text-[10px] text-muted/70 bg-sand/10 p-3 overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(detail.form_data, null, 2)}
              </pre>
            </details>

            {/* 備註 */}
            <div>
              <label className="font-sans text-[11px] text-muted block mb-1">行政備註</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50 resize-none"
                placeholder="記錄聯繫狀況、備忘等…"
              />
            </div>

            <div className="flex gap-2 pt-2 flex-wrap">
              <button
                onClick={() => saveNotes(detail.id)}
                disabled={saving}
                className="font-sans text-xs px-4 py-2 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors"
              >
                {saving ? "儲存中…" : "儲存備註"}
              </button>
              {detail.status === "new" && (
                <button
                  onClick={() => updateStatus(detail.id, "contacted", notes)}
                  disabled={saving}
                  className="font-sans text-xs px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
                >
                  標記已聯繫
                </button>
              )}
              {detail.status === "contacted" && (
                <button
                  onClick={() => updateStatus(detail.id, "converted", notes)}
                  disabled={saving}
                  className="font-sans text-xs px-4 py-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
                >
                  已轉個案
                </button>
              )}
              <button
                onClick={() => setDetail(null)}
                className="font-sans text-xs px-4 py-2 border border-sand/30 text-muted hover:text-deep ml-auto transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
