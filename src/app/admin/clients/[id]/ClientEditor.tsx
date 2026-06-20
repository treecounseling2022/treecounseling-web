"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Therapist = { id: string; name: string };

type EmergencyContact = { name: string; phone: string; relationship: string };

type ClientData = {
  id?: string;
  client_code: string;
  full_name: string;
  name_en: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  emergency_contact: EmergencyContact;
  assigned_therapist_id: string;
  referral_source: string;
  intake_notes: string;
  admin_notes: string;
  prior_sessions: number;
  service_type: string;
  couple_partner_id: string;
};

const GENDER_OPTIONS = [
  { value: "", label: "（未填寫）" },
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "other", label: "其他" },
  { value: "prefer_not_to_say", label: "不願透露" },
];

function calcAge(dob: string | null | undefined): string {
  if (!dob) return "—";
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age} 歲`;
}

export default function ClientEditor({
  initialData,
  therapists,
  readonly = false,
  hideContact = false,
}: {
  initialData: Partial<ClientData> & { id?: string };
  therapists: Therapist[];
  readonly?: boolean;
  hideContact?: boolean;
}) {
  const router = useRouter();
  const isNew = !initialData.id;

  const [form, setForm] = useState<ClientData>({
    client_code: (initialData as { client_code?: string }).client_code ?? "",
    full_name: initialData.full_name ?? "",
    name_en: initialData.name_en ?? "",
    dob: initialData.dob ?? "",
    gender: initialData.gender ?? "",
    phone: initialData.phone ?? "",
    email: initialData.email ?? "",
    emergency_contact: initialData.emergency_contact ?? { name: "", phone: "", relationship: "" },
    assigned_therapist_id: initialData.assigned_therapist_id ?? "",
    referral_source: initialData.referral_source ?? "",
    intake_notes: initialData.intake_notes ?? "",
    admin_notes: initialData.admin_notes ?? "",
    prior_sessions: (initialData as { prior_sessions?: number }).prior_sessions ?? 0,
    service_type: (initialData as { service_type?: string }).service_type ?? "individual",
    couple_partner_id: (initialData as { couple_partner_id?: string }).couple_partner_id ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  async function generateCode() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/clients/generate-code");
      const data = await res.json();
      if (res.ok && data.code) {
        setField("client_code", data.code);
        setSaved(false);
      }
    } finally {
      setGenerating(false);
    }
  }

  function setField<K extends keyof ClientData>(key: K, value: ClientData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function setEc(key: keyof EmergencyContact, value: string) {
    setForm((f) => ({
      ...f,
      emergency_contact: { ...f.emergency_contact, [key]: value },
    }));
    setSaved(false);
  }

  async function save() {
    if (!form.full_name.trim()) { setErr("請填寫姓名"); return; }
    setSaving(true);
    setErr("");
    try {
      const payload = {
        ...form,
        client_code: form.client_code.trim() || null,
        assigned_therapist_id: form.assigned_therapist_id || null,
        dob: form.dob || null,
        gender: form.gender || null,
      };
      const url = isNew ? "/api/admin/clients" : `/api/admin/clients/${initialData.id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? "發生錯誤"); return; }
      if (isNew) {
        router.push(`/admin/clients/${json.id}`);
      } else {
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!confirm("確定要封存此個案？封存後個案將不會出現在列表中。")) return;
    const res = await fetch(`/api/admin/clients/${initialData.id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/clients");
  }

  const inputCls = `w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50${readonly ? " bg-sand/5 cursor-default" : ""}`;
  const labelCls = "font-sans text-[11px] text-muted block mb-1";
  const sectionCls = "space-y-4 pt-6 border-t border-sand/20";
  const roLabelCls = "font-sans text-[11px] text-muted mb-1";
  const roValueCls = "font-sans text-sm text-deep";

  // ── Therapist read-only view ──────────────────────────────────────────────
  if (readonly) {
    const genderLabel = GENDER_OPTIONS.find((o) => o.value === form.gender)?.label;
    return (
      <div className="space-y-6">
        {/* 基本資料 */}
        <div className="space-y-4">
          <h2 className="font-serif text-deep text-base">基本資料</h2>
          {form.client_code && (
            <div>
              <p className={roLabelCls}>個案編號</p>
              <p className="font-sans text-sm text-deep font-mono">{form.client_code}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={roLabelCls}>年齡</p>
              <p className={roValueCls}>{calcAge(form.dob)}</p>
            </div>
            <div>
              <p className={roLabelCls}>性別</p>
              <p className={roValueCls}>{genderLabel && genderLabel !== "（未填寫）" ? genderLabel : "—"}</p>
            </div>
          </div>
        </div>

        {/* 聯絡方式 — 心理師無權限查看 */}
        {!hideContact && (
          <div className="pt-6 border-t border-sand/20 space-y-4">
            <h2 className="font-serif text-deep text-base">聯絡方式</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className={roLabelCls}>電話</p>
                <p className={roValueCls}>{form.phone || "—"}</p>
              </div>
              <div>
                <p className={roLabelCls}>Email</p>
                <p className={roValueCls}>{form.email || "—"}</p>
              </div>
            </div>
            <div>
              <p className={roLabelCls}>緊急聯絡人</p>
              {form.emergency_contact.name ? (
                <p className={roValueCls}>
                  {form.emergency_contact.name}
                  {form.emergency_contact.relationship && `（${form.emergency_contact.relationship}）`}
                  {form.emergency_contact.phone && ` · ${form.emergency_contact.phone}`}
                </p>
              ) : (
                <p className="font-sans text-sm text-muted/40">—</p>
              )}
            </div>
          </div>
        )}

        {/* 初次申請說明 */}
        {form.intake_notes && (
          <div className="pt-6 border-t border-sand/20 space-y-2">
            <h2 className="font-serif text-deep text-base">初次申請說明</h2>
            <p className="font-sans text-sm text-deep bg-sand/10 px-4 py-3 leading-relaxed whitespace-pre-wrap">
              {form.intake_notes}
            </p>
          </div>
        )}

        <a href="/admin/clients" className="font-sans text-xs text-muted hover:text-deep transition-colors">
          ← 返回列表
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 基本資料 */}
      <div className="space-y-4">
        <h2 className="font-serif text-deep text-base">基本資料</h2>

        {/* 個案編號 */}
        <div>
          <label className={labelCls}>個案編號</label>
          <div className="flex gap-2">
            <input
              value={form.client_code}
              onChange={(e) => setField("client_code", e.target.value)}
              className={inputCls + " font-mono"}
              placeholder="留空則不指定編號"
              disabled={readonly}
            />
            {!readonly && (
              <button
                type="button"
                onClick={generateCode}
                disabled={generating}
                className="flex-shrink-0 font-sans text-xs px-3 py-2 border border-sand/30 text-muted hover:bg-sand/10 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                {generating ? "…" : "自動產生"}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>姓名 *</label>
            <input value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} className={inputCls} placeholder="中文姓名" disabled={readonly} />
          </div>
          <div>
            <label className={labelCls}>英文姓名</label>
            <input value={form.name_en} onChange={(e) => setField("name_en", e.target.value)} className={inputCls} placeholder="English Name" disabled={readonly} />
          </div>
          <div>
            <label className={labelCls}>出生日期</label>
            <input type="date" value={form.dob} onChange={(e) => setField("dob", e.target.value)} className={inputCls} disabled={readonly} />
          </div>
          <div>
            <label className={labelCls}>性別</label>
            <select value={form.gender} onChange={(e) => setField("gender", e.target.value)} className={inputCls} disabled={readonly}>
              {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 聯絡方式 */}
      <div className={sectionCls}>
        <h2 className="font-serif text-deep text-base">聯絡方式</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>電話</label>
            <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} className={inputCls} placeholder="+853 xxxx xxxx" disabled={readonly} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className={inputCls} disabled={readonly} />
          </div>
        </div>
        <div>
          <p className={labelCls}>緊急聯絡人</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={form.emergency_contact.name} onChange={(e) => setEc("name", e.target.value)} className={inputCls} placeholder="姓名" disabled={readonly} />
            <input value={form.emergency_contact.phone} onChange={(e) => setEc("phone", e.target.value)} className={inputCls} placeholder="電話" disabled={readonly} />
            <input value={form.emergency_contact.relationship} onChange={(e) => setEc("relationship", e.target.value)} className={inputCls} placeholder="關係（如：母親）" disabled={readonly} />
          </div>
        </div>
      </div>

      {/* 派案資訊 */}
      <div className={sectionCls}>
        <h2 className="font-serif text-deep text-base">派案資訊</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>服務類型</label>
            <select value={form.service_type} onChange={(e) => setField("service_type", e.target.value)} className={inputCls} disabled={readonly}>
              <option value="individual">個人諮商</option>
              <option value="couple">伴侶諮商</option>
              <option value="hoarding">囤積症諮商</option>
              <option value="other">其他</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>負責心理師</label>
          <select value={form.assigned_therapist_id} onChange={(e) => setField("assigned_therapist_id", e.target.value)} className={inputCls} disabled={readonly}>
            <option value="">（未指派）</option>
            {therapists.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>轉介來源</label>
          <input value={form.referral_source} onChange={(e) => setField("referral_source", e.target.value)} className={inputCls} placeholder="例：朋友介紹、網路搜尋" disabled={readonly} />
        </div>
        <div>
          <label className={labelCls}>初次申請說明（個案填寫）</label>
          <textarea
            value={form.intake_notes}
            onChange={(e) => setField("intake_notes", e.target.value)}
            rows={4}
            className={inputCls + " resize-none"}
            placeholder="個案提供的背景資訊…"
            disabled={readonly}
          />
        </div>
        {!readonly && (
          <div>
            <label className={labelCls}>舊系統已完成諮商次數</label>
            <p className="font-sans text-[11px] text-muted/60 mb-1">
              使用新系統前已完成的諮商次數，用於計算階梯式抽成的累計起始值。新個案填 0。
            </p>
            <input
              type="number"
              min={0}
              step={1}
              value={form.prior_sessions}
              onChange={(e) => setField("prior_sessions", Math.max(0, parseInt(e.target.value) || 0))}
              className={inputCls}
              style={{ maxWidth: 120 }}
            />
          </div>
        )}
      </div>

      {/* 行政備註：僅管理員可見 */}
      {!readonly && (
        <div className={sectionCls}>
          <h2 className="font-serif text-deep text-base">行政備註</h2>
          <p className="font-sans text-[11px] text-muted/70">此備註僅行政可見，心理師無法看到。</p>
          <textarea
            value={form.admin_notes}
            onChange={(e) => setField("admin_notes", e.target.value)}
            rows={3}
            className={inputCls + " resize-none"}
            placeholder="內部備註…"
          />
        </div>
      )}

      {/* Actions */}
      {!readonly && (
        <>
          {err && <p className="font-sans text-xs text-red-500">{err}</p>}
          {saved && <p className="font-sans text-xs text-forest">已儲存</p>}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="font-sans text-sm px-6 py-2 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors"
            >
              {saving ? "儲存中…" : isNew ? "建立個案" : "儲存變更"}
            </button>
            <a href="/admin/clients" className="font-sans text-xs text-muted hover:text-deep transition-colors">
              返回列表
            </a>
            {!isNew && (
              <button
                onClick={archive}
                className="ml-auto font-sans text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                封存個案
              </button>
            )}
          </div>
        </>
      )}
      {readonly && (
        <a href="/admin/clients" className="font-sans text-xs text-muted hover:text-deep transition-colors">
          ← 返回列表
        </a>
      )}
    </div>
  );
}
