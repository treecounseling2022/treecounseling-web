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
  client_id: string | null;
  appointment_id: string | null;
};

type TherapistService = { name?: string; fee?: string | number; duration?: string; note?: string };
type Therapist = { id: string; name: string; services?: TherapistService[] };
type Room = { id: string; name: string; is_online?: boolean };

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

const FIELD_LABEL: Record<string, string> = {
  gender: "性別",
  birthday: "出生日期",
  city: "居住城市",
  contactType: "聯絡方式",
  contactId: "聯絡帳號 / ID",
  meetingType: "晤談方式",
  nativeLanguage: "母語",
  devices: "可使用設備",
  preferredTherapist: "偏好心理輔導人員",
};

const VALUE_MAP: Record<string, string> = {
  face: "面談",
  online: "線上晤談",
  whatsapp: "WhatsApp",
  email: "Email",
  cantonese: "粵語",
  mandarin: "普通話 / 國語",
  english: "英語",
  yes: "有",
  no: "沒有",
};

const SKIP_TOP = new Set(["serviceType", "name", "email", "phone", "preferredTimes", "concern", "signature", "individualDetails", "coupleDetails", "otherDetails"]);

function FieldRow({ label, value }: { label: string; value: unknown }) {
  const fmt = (v: unknown): string => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "string") return (VALUE_MAP[v] ?? v) || "—";
    if (Array.isArray(v)) return (v as string[]).map((i) => VALUE_MAP[i] ?? i).join("、") || "—";
    return String(v);
  };
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 text-xs py-1 border-b border-sand/10 last:border-0">
      <span className="font-sans text-muted/60">{label}</span>
      <span className="font-sans text-deep whitespace-pre-wrap">{fmt(value)}</span>
    </div>
  );
}

function IndividualDetails({ d }: { d: Record<string, unknown> }) {
  const INDIVIDUAL_LABEL: Record<string, string> = {
    mainCategories: "困擾類型",
    subCategories: "困擾細項",
    behaviorFrequency: "成癮行為頻率",
    behaviorImpact: "成癮影響面向",
    hasPsychiatryExp: "曾有精神科就診",
    psychiatryDetails: "精神科就診說明",
    hasCounselingExp: "曾有心理輔導經驗",
    counselingDetails: "輔導經歷說明",
    therapistRequirements: "對心理師的要求",
  };
  return (
    <div className="space-y-0">
      {Object.entries(d).map(([k, v]) => (
        <FieldRow key={k} label={INDIVIDUAL_LABEL[k] ?? k} value={v} />
      ))}
    </div>
  );
}

function CoupleDetails({ d }: { d: Record<string, unknown> }) {
  const pa = d.partnerA as Record<string, unknown> | undefined;
  const pb = d.partnerB as Record<string, unknown> | undefined;
  const PARTNER_LABEL: Record<string, string> = {
    name: "姓名", gender: "性別", birthday: "出生日期",
    language: "母語", contactId: "聯絡帳號", email: "電郵", phone: "電話",
  };
  return (
    <div className="space-y-3">
      {pa && (
        <div>
          <p className="font-sans text-[11px] text-forest font-medium mb-1">伴侶 A</p>
          {Object.entries(pa).map(([k, v]) => <FieldRow key={k} label={PARTNER_LABEL[k] ?? k} value={v} />)}
        </div>
      )}
      {pb && (
        <div>
          <p className="font-sans text-[11px] text-forest font-medium mb-1">伴侶 B</p>
          {Object.entries(pb).map(([k, v]) => <FieldRow key={k} label={PARTNER_LABEL[k] ?? k} value={v} />)}
        </div>
      )}
      {!!d.issues && <FieldRow label="遇到的狀況" value={d.issues} />}
      {!!d.duration && <FieldRow label="關係時長" value={d.duration} />}
      {!!d.children && <FieldRow label="子女" value={d.children} />}
      {!!d.meetingType && <FieldRow label="晤談方式" value={d.meetingType} />}
      {!!d.contactType && <FieldRow label="聯絡方式" value={d.contactType} />}
    </div>
  );
}

function OtherDetails({ d }: { d: Record<string, unknown> }) {
  const LABEL: Record<string, string> = {
    companyName: "機構 / 單位名稱",
    contactPerson: "聯絡人",
    contactType: "聯絡方式",
    contactId: "聯絡帳號",
    theme: "項目主題",
  };
  return (
    <div className="space-y-0">
      {Object.entries(d).map(([k, v]) => <FieldRow key={k} label={LABEL[k] ?? k} value={v} />)}
    </div>
  );
}

function FormDataDisplay({ data }: { data: Record<string, unknown> }) {
  const topFields = Object.entries(data).filter(([k]) => !SKIP_TOP.has(k) && k !== "signature");
  const sig = data.signature as string | undefined;
  const ind = data.individualDetails as Record<string, unknown> | undefined;
  const couple = data.coupleDetails as Record<string, unknown> | undefined;
  const other = data.otherDetails as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4">
      {/* Top-level fields */}
      {topFields.length > 0 && (
        <div className="space-y-0">
          {topFields.map(([k, v]) => (
            <FieldRow key={k} label={FIELD_LABEL[k] ?? k} value={v} />
          ))}
        </div>
      )}

      {/* Individual details */}
      {ind && (
        <div>
          <p className="font-sans text-[11px] text-forest font-medium mb-2 mt-2">困擾詳情</p>
          <IndividualDetails d={ind} />
        </div>
      )}

      {/* Couple details */}
      {couple && (
        <div>
          <p className="font-sans text-[11px] text-forest font-medium mb-2 mt-2">伴侶資料</p>
          <CoupleDetails d={couple} />
        </div>
      )}

      {/* Other / org details */}
      {other && (
        <div>
          <p className="font-sans text-[11px] text-forest font-medium mb-2 mt-2">機構合作資料</p>
          <OtherDetails d={other} />
        </div>
      )}

      {/* Signature */}
      {sig && sig.startsWith("data:image/") && (
        <div>
          <p className="font-sans text-[11px] text-muted/60 mb-1">知情同意簽名</p>
          <div className="border border-sand/20 inline-block bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sig} alt="簽名" style={{ maxWidth: 300, display: "block" }} />
          </div>
        </div>
      )}
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
    scheduled_date: new Date().toISOString().slice(0, 10),
    scheduled_time: "",
    session_fee: "",
    is_online: false,
  });

  function guessTherapistFee(therapist: Therapist): string {
    const services = therapist.services ?? [];
    const svcType = inquiry.service_type;
    const keywords: Record<string, string[]> = {
      individual: ["個人", "個別", "individual"],
      couple: ["伴侶", "couple", "partner"],
      hoarding: ["囤積", "hoarding"],
    };
    const kws = keywords[svcType] ?? [];
    const match = kws.length > 0
      ? services.find((s) => kws.some((kw) => (s.name ?? "").toLowerCase().includes(kw)))
      : null;
    const svc = match ?? services[0];
    if (!svc?.fee) return "";
    const num = typeof svc.fee === "number" ? svc.fee : parseFloat(String(svc.fee).replace(/[^\d.]/g, ""));
    return isNaN(num) ? "" : String(num);
  }
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
    const scheduledAt = (assignForm.scheduled_date && assignForm.scheduled_time)
      ? `${assignForm.scheduled_date}T${assignForm.scheduled_time}:00+08:00`
      : undefined;
    console.log("[doAssign] scheduledAt =", scheduledAt, "| date =", assignForm.scheduled_date, "| time =", assignForm.scheduled_time);
    const res = await fetch(`/api/admin/inquiries/${inquiry.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        therapist_id: assignForm.therapist_id,
        room_id: assignForm.room_id || undefined,
        scheduled_at: scheduledAt,
        session_fee: assignForm.session_fee ? Number(assignForm.session_fee) : undefined,
        is_online: assignForm.is_online,
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

  const CLINICAL_TYPES = new Set(["individual", "couple", "hoarding"]);
  const canAssign = inquiry.status !== "converted" && inquiry.status !== "closed" && CLINICAL_TYPES.has(inquiry.service_type);

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
        {inquiry.client_id && (
          <a
            href={`/admin/clients/${inquiry.client_id}`}
            className="font-sans text-xs px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors"
          >
            查看個案 →
          </a>
        )}
        {inquiry.appointment_id && (
          <a
            href={`/admin/appointments`}
            className="font-sans text-xs px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
          >
            查看預約 →
          </a>
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
            className="bg-white p-6 w-full max-w-md space-y-4 shadow-sm"
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
                  onChange={(e) => {
                    const tid = e.target.value;
                    const t = therapists.find((x) => x.id === tid);
                    const fee = t ? guessTherapistFee(t) : "";
                    setAssignForm((f) => ({ ...f, therapist_id: tid, session_fee: fee || f.session_fee }));
                  }}
                  className="w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50 bg-white"
                >
                  <option value="">— 請選擇 —</option>
                  {therapists.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-sans text-xs text-muted block mb-1">諮商空間（選填）</label>
                <select
                  value={assignForm.room_id}
                  onChange={(e) => setAssignForm((f) => ({ ...f, room_id: e.target.value }))}
                  className="w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50 bg-white"
                >
                  <option value="">— 待定 —</option>
                  {rooms.filter((r) => !r.is_online).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-sand/20 pt-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={assignForm.is_online}
                    onChange={(e) => setAssignForm((f) => ({ ...f, is_online: e.target.checked, room_id: e.target.checked ? "" : f.room_id }))}
                    className="accent-forest w-4 h-4"
                  />
                  <span className="font-sans text-sm text-deep">線上諮商</span>
                </label>
              </div>

              <div>
                <label className="font-sans text-xs text-muted block mb-1">預計時間（選填）</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={assignForm.scheduled_date}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setAssignForm((f) => ({ ...f, scheduled_date: e.target.value }))}
                    className="flex-1 border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50"
                  />
                  <select
                    value={assignForm.scheduled_time ? assignForm.scheduled_time.slice(0, 2) : ""}
                    onChange={(e) => { const hh = e.target.value; const mm = assignForm.scheduled_time ? (assignForm.scheduled_time.slice(3, 5) || "00") : "00"; setAssignForm((f) => ({ ...f, scheduled_time: hh ? `${hh}:${mm}` : "" })); }}
                    className="border border-sand/30 px-2 py-2 font-sans text-sm text-deep bg-white focus:outline-none focus:border-forest/50"
                  >
                    <option value="">時</option>
                    {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span className="text-muted text-sm">:</span>
                  <select
                    value={assignForm.scheduled_time ? assignForm.scheduled_time.slice(3, 5) : ""}
                    onChange={(e) => { const mm = e.target.value; const hh = assignForm.scheduled_time ? (assignForm.scheduled_time.slice(0, 2) || "09") : "09"; setAssignForm((f) => ({ ...f, scheduled_time: mm ? `${hh}:${mm}` : "" })); }}
                    className="border border-sand/30 px-2 py-2 font-sans text-sm text-deep bg-white focus:outline-none focus:border-forest/50"
                  >
                    <option value="">分</option>
                    {["00", "15", "30", "45"].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
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
