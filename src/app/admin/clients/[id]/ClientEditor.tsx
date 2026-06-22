"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Therapist = { id: string; name: string };

type EmergencyContact = { name: string; phone: string; relationship: string };

type PresentingConcern = { category: string; items: string[] };

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
  // 擴充欄位
  native_language: string;
  preferred_meeting_type: string;
  has_psychiatry_history: boolean | null;
  psychiatry_notes: string;
  has_prior_counseling: boolean | null;
  prior_counseling_notes: string;
  presenting_concerns: PresentingConcern[];
  city: string;
  consent_signed_at: string;
  relationship_duration: string;
  children_info: string;
};

const COUPLE_CONCERNS = [
  "外遇", "管教子女", "經濟議題", "溝通不良",
  "婆媳關係", "婚前輔導", "親密議題", "生育議題", "其他",
];

const INDIVIDUAL_CONCERNS = [
  {
    id: "addiction",
    label: "成癮問題",
    items: [
      "酒精成癮 (飲酒失控、戒酒困難)",
      "藥物成癮 (非法藥物、處方藥依賴)",
      "網路/手機成癮 (過度使用、影響生活)",
      "購物成癮 (過度消費、無法自控)",
      "性成癮 (過度性行為、色情依賴)",
      "賭博成癮",
      "其他",
    ],
  },
  {
    id: "self_explore",
    label: "自我探索",
    items: [
      "自我認同 (價值、目標、人生方向)",
      "性格特質探索",
      "性別認同 / 性傾向",
      "信仰 / 信念困擾",
      "興趣與長處發掘",
      "人生價值意義探尋",
      "自我批判 / 自我接納議題",
      "其他",
    ],
  },
  {
    id: "family",
    label: "家庭關係",
    items: [
      "與父母衝突或疏離",
      "與兄弟姊妹爭執或競爭",
      "家庭溝通困難",
      "家庭界線模糊 / 互動壓力",
      "原生家庭創傷或影響",
      "家庭成員疾病 / 失落壓力",
      "其他",
    ],
  },
  {
    id: "couple_rel",
    label: "伴侶關係",
    items: [
      "溝通模式困擾",
      "信任 / 忠誠 / 背叛",
      "伴侶間價值 / 目標落差",
      "感情冷淡 / 疏離感",
      "性生活 / 親密困擾",
      "受暴 / 控制或依賴關係",
      "分手 / 離婚調適",
      "其他",
    ],
  },
  {
    id: "parenting",
    label: "親子關係",
    items: [
      "與子女溝通困難",
      "親子衝突與規範爭議",
      "教養壓力 / 育兒困擾",
      "子女行為 / 發展問題",
      "距離 (遠距家庭、親子疏離)",
      "特殊需求 (身心障礙、適應特殊情形)",
      "其他",
    ],
  },
  {
    id: "work_press",
    label: "工作壓力",
    items: [
      "職場人際衝突",
      "工作負荷過重 / 疲勞",
      "工作動力低落",
      "工作倦怠 / 厭倦",
      "職位 / 職稱調整困擾",
      "失業 / 就業困難",
      "職場霸凌 / 歧視",
      "其他",
    ],
  },
  {
    id: "academic",
    label: "學業/生涯",
    items: [
      "學習動機低落",
      "考試 / 升學焦慮",
      "成績壓力 / 退步",
      "生涯規劃迷惘",
      "將來職涯方向不明 / 轉換",
      "家長 / 他人期待壓力",
      "校園人際議題",
      "其他",
    ],
  },
  {
    id: "interpersonal",
    label: "人際關係",
    items: [
      "社交焦慮 / 害怕被拒絕",
      "朋友疏離 / 被排擠",
      "隱私或界線困難",
      "難以建立深度連結",
      "被批評 / 誤解困擾",
      "團體適應困難",
      "社交技巧困難",
      "其他",
    ],
  },
  {
    id: "emotion",
    label: "情緒困擾",
    items: [
      "長期憂鬱 / 低落感",
      "容易緊張 / 焦慮不安",
      "易怒 / 衝動情緒",
      "情緒波動大",
      "壓力難以排解",
      "無明原因的哭泣 / 空虛感",
      "其他",
    ],
  },
  {
    id: "other_issue",
    label: "其他困擾",
    items: [],
  },
];

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
  isDirector = false,
}: {
  initialData: Partial<ClientData> & { id?: string };
  therapists: Therapist[];
  readonly?: boolean;
  hideContact?: boolean;
  isDirector?: boolean;
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
    native_language: (initialData as { native_language?: string }).native_language ?? "",
    preferred_meeting_type: (initialData as { preferred_meeting_type?: string }).preferred_meeting_type ?? "",
    has_psychiatry_history: (initialData as { has_psychiatry_history?: boolean | null }).has_psychiatry_history ?? null,
    psychiatry_notes: (initialData as { psychiatry_notes?: string }).psychiatry_notes ?? "",
    has_prior_counseling: (initialData as { has_prior_counseling?: boolean | null }).has_prior_counseling ?? null,
    prior_counseling_notes: (initialData as { prior_counseling_notes?: string }).prior_counseling_notes ?? "",
    presenting_concerns: (initialData as { presenting_concerns?: PresentingConcern[] }).presenting_concerns ?? [],
    city: (initialData as { city?: string }).city ?? "",
    consent_signed_at: (initialData as { consent_signed_at?: string }).consent_signed_at ?? "",
    relationship_duration: (initialData as { relationship_duration?: string }).relationship_duration ?? "",
    children_info: (initialData as { children_info?: string }).children_info ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  // 伴侶搜尋
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerResults, setPartnerResults] = useState<{ id: string; full_name: string; client_code: string | null }[]>([]);
  const [partnerSearching, setPartnerSearching] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const partnerSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初始化時若已有 couple_partner_id，查詢對方姓名
  useEffect(() => {
    if (!form.couple_partner_id) return;
    fetch(`/api/admin/clients/${form.couple_partner_id}`)
      .then((r) => r.json())
      .then((d) => { if (d?.full_name) setPartnerName(d.full_name); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePartnerSearchChange(q: string) {
    setPartnerSearch(q);
    if (partnerSearchRef.current) clearTimeout(partnerSearchRef.current);
    if (!q.trim()) { setPartnerResults([]); return; }
    partnerSearchRef.current = setTimeout(async () => {
      setPartnerSearching(true);
      try {
        const res = await fetch(`/api/admin/clients?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setPartnerResults(
          (data as { id: string; full_name: string; client_code: string | null }[])
            .filter((c) => c.id !== initialData.id)
            .slice(0, 6)
        );
      } finally {
        setPartnerSearching(false);
      }
    }, 300);
  }

  function selectPartner(client: { id: string; full_name: string; client_code: string | null }) {
    setField("couple_partner_id", client.id);
    setPartnerName(client.full_name);
    setPartnerSearch("");
    setPartnerResults([]);
  }

  function clearPartner() {
    setField("couple_partner_id", "");
    setPartnerName("");
  }

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
        couple_partner_id: form.couple_partner_id || null,
        dob: form.dob || null,
        gender: form.gender || null,
        native_language: form.native_language || null,
        preferred_meeting_type: form.preferred_meeting_type || null,
        city: form.city.trim() || null,
        consent_signed_at: form.consent_signed_at || null,
        psychiatry_notes: form.has_psychiatry_history === true ? form.psychiatry_notes : null,
        prior_counseling_notes: form.has_prior_counseling === true ? form.prior_counseling_notes : null,
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

  async function hardDelete() {
    if (!confirm("⚠️ 確定要永久刪除此個案？\n\n此操作無法復原，所有相關資料（預約、晤談記錄）將一併刪除。")) return;
    const res = await fetch(`/api/admin/clients/${initialData.id}?permanent=true`, { method: "DELETE" });
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
        {form.service_type !== "couple" && form.intake_notes && (
          <div className="pt-6 border-t border-sand/20 space-y-2">
            <h2 className="font-serif text-deep text-base">初次申請說明</h2>
            <p className="font-sans text-sm text-deep bg-sand/10 px-4 py-3 leading-relaxed whitespace-pre-wrap">
              {form.intake_notes}
            </p>
          </div>
        )}

        {/* 臨床背景 — 唯讀版，心理師可見 */}
        {(form.presenting_concerns.length > 0 ||
          form.has_psychiatry_history !== null ||
          form.has_prior_counseling !== null ||
          form.native_language ||
          form.preferred_meeting_type ||
          (form.service_type === "couple" && (form.intake_notes || form.relationship_duration || form.children_info))) && (
          <div className="pt-6 border-t border-sand/20 space-y-4">
            <h2 className="font-serif text-deep text-base">臨床背景</h2>

            {form.presenting_concerns.length > 0 && (
              <div>
                <p className={roLabelCls}>主訴困擾類型</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {form.presenting_concerns.map((pc) => (
                    <span key={pc.category} className="font-sans text-xs bg-forest/10 text-forest border border-forest/20 px-2 py-0.5">
                      {pc.category}
                    </span>
                  ))}
                </div>
                {form.presenting_concerns.some((pc) => pc.items.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.presenting_concerns.flatMap((pc) => pc.items).map((item) => (
                      <span key={item} className="font-sans text-xs bg-sand/20 text-muted border border-sand/20 px-2 py-0.5">
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {form.service_type === "couple" && form.intake_notes && (
              <div>
                <p className={roLabelCls}>主訴說明</p>
                <p className="font-sans text-sm text-deep bg-sand/10 px-4 py-3 leading-relaxed whitespace-pre-wrap">{form.intake_notes}</p>
              </div>
            )}

            {form.service_type === "couple" && (form.relationship_duration || form.children_info) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={roLabelCls}>關係時長</p>
                  <p className={roValueCls}>{form.relationship_duration || "—"}</p>
                </div>
                <div>
                  <p className={roLabelCls}>子女資訊</p>
                  <p className={roValueCls}>{form.children_info || "—"}</p>
                </div>
              </div>
            )}

            {(form.native_language || form.preferred_meeting_type) && (
              <div className="grid grid-cols-2 gap-4">
                {form.native_language && (
                  <div>
                    <p className={roLabelCls}>輔導語言</p>
                    <p className={roValueCls}>
                      {({ cantonese: "粵語", mandarin: "普通話 / 國語", english: "英語", other: "其他" } as Record<string,string>)[form.native_language] ?? form.native_language}
                    </p>
                  </div>
                )}
                {form.preferred_meeting_type && (
                  <div>
                    <p className={roLabelCls}>偏好晤談方式</p>
                    <p className={roValueCls}>
                      {({ face: "面談", online: "線上", both: "面談或線上均可" } as Record<string,string>)[form.preferred_meeting_type] ?? form.preferred_meeting_type}
                    </p>
                  </div>
                )}
              </div>
            )}

            {form.has_psychiatry_history !== null && (
              <div>
                <p className={roLabelCls}>曾有精神科就診經驗</p>
                <p className={roValueCls}>{form.has_psychiatry_history === true ? "有" : "沒有"}</p>
                {form.has_psychiatry_history === true && form.psychiatry_notes && (
                  <p className="font-sans text-sm text-deep bg-sand/10 px-4 py-3 mt-1 leading-relaxed whitespace-pre-wrap">{form.psychiatry_notes}</p>
                )}
              </div>
            )}

            {form.has_prior_counseling !== null && (
              <div>
                <p className={roLabelCls}>曾有接受心理輔導或諮商經驗</p>
                <p className={roValueCls}>{form.has_prior_counseling === true ? "有" : "沒有"}</p>
                {form.has_prior_counseling === true && form.prior_counseling_notes && (
                  <p className="font-sans text-sm text-deep bg-sand/10 px-4 py-3 mt-1 leading-relaxed whitespace-pre-wrap">{form.prior_counseling_notes}</p>
                )}
              </div>
            )}

            {form.city && (
              <div>
                <p className={roLabelCls}>居住城市</p>
                <p className={roValueCls}>{form.city}</p>
              </div>
            )}
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
      {/* ── 服務類型（最優先選擇）── */}
      <div className="space-y-3 p-4 bg-soft/40 border border-sand/20">
        <h2 className="font-serif text-deep text-base">服務類型</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { value: "individual", label: "個人諮商" },
            { value: "couple", label: "伴侶諮商" },
            { value: "hoarding", label: "囤積症諮商" },
            { value: "other", label: "其他" },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="service_type"
                value={opt.value}
                checked={form.service_type === opt.value}
                onChange={() => {
                  setField("service_type", opt.value);
                  setField("presenting_concerns", []);
                }}
                className="w-4 h-4 border border-sand accent-forest"
              />
              <span className="font-sans text-sm text-deep">{opt.label}</span>
            </label>
          ))}
        </div>

        {/* 伴侶連結（僅伴侶諮商顯示）*/}
        {form.service_type === "couple" && (
          <div className="pt-3 border-t border-sand/15 space-y-2">
            <p className={labelCls}>連結另一方伴侶個案</p>
            {form.couple_partner_id ? (
              <div className="flex items-center gap-3">
                <span className="font-sans text-sm text-deep bg-forest/10 border border-forest/20 px-3 py-1.5">
                  {partnerName || form.couple_partner_id}
                </span>
                <button
                  type="button"
                  onClick={clearPartner}
                  className="font-sans text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  取消連結
                </button>
              </div>
            ) : (
              <div className="relative max-w-sm">
                <input
                  value={partnerSearch}
                  onChange={(e) => handlePartnerSearchChange(e.target.value)}
                  className={inputCls}
                  placeholder="輸入姓名搜尋個案…"
                />
                {partnerSearching && (
                  <p className="font-sans text-xs text-muted px-1 pt-1">搜尋中…</p>
                )}
                {partnerResults.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 bg-paper border border-sand/30 shadow-sm">
                    {partnerResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectPartner(c)}
                        className="w-full text-left px-3 py-2 font-sans text-sm text-deep hover:bg-soft transition-colors border-b border-sand/10 last:border-0"
                      >
                        {c.full_name}
                        {c.client_code && (
                          <span className="ml-2 text-xs text-muted font-mono">{c.client_code}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {partnerSearch && !partnerSearching && partnerResults.length === 0 && (
                  <p className="font-sans text-xs text-muted/60 px-1 pt-1">找不到符合的個案</p>
                )}
              </div>
            )}
            <p className="font-sans text-[10px] text-muted/50">
              連結後雙方各自保有獨立記錄，僅互相關聯。若對方記錄尚未建立，可稍後再連結。
            </p>
          </div>
        )}
      </div>

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
        {form.service_type !== "couple" && (
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
        )}
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

      {/* 臨床背景 */}
      {!readonly && (
        <div className={sectionCls}>
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-deep text-base">臨床背景</h2>
            {form.service_type === "couple" && (
              <span className="font-sans text-[10px] text-sand border border-sand/30 px-2 py-0.5">
                「困擾 / 關係 / 子女」欄位與伴侶共享，儲存後自動同步
              </span>
            )}
          </div>

          {/* 主訴困擾 — 根據服務類型顯示不同清單 */}
          {form.service_type === "couple" ? (
            <div className="space-y-2">
              <label className={labelCls}>伴侶輔導困擾（可多選）</label>
              <div className="flex flex-wrap gap-2">
                {COUPLE_CONCERNS.map((c) => {
                  const selected = form.presenting_concerns.some((pc) => pc.category === c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          setField("presenting_concerns", form.presenting_concerns.filter((pc) => pc.category !== c));
                        } else {
                          setField("presenting_concerns", [...form.presenting_concerns, { category: c, items: [] }]);
                        }
                      }}
                      className={`font-sans text-xs px-3 py-1 border transition-colors ${
                        selected
                          ? "bg-forest/10 border-forest text-forest"
                          : "border-sand/30 text-muted hover:border-sand/60"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              {/* 主訴說明 */}
              <div>
                <label className={labelCls}>主訴說明（共同）</label>
                <textarea
                  value={form.intake_notes}
                  onChange={(e) => setField("intake_notes", e.target.value)}
                  rows={4}
                  className={inputCls + " resize-none"}
                  placeholder="描述伴侶目前遇到的主要困擾與狀況…"
                />
              </div>
              {/* 伴侶專屬欄位 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>關係時長</label>
                  <input
                    value={form.relationship_duration}
                    onChange={(e) => setField("relationship_duration", e.target.value)}
                    className={inputCls}
                    placeholder="如：交往兩年、結婚五年"
                  />
                </div>
                <div>
                  <label className={labelCls}>子女資訊</label>
                  <input
                    value={form.children_info}
                    onChange={(e) => setField("children_info", e.target.value)}
                    className={inputCls}
                    placeholder="如：一子一女（8歲、5歲）"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className={labelCls}>主訴困擾類型（可多選）</label>
              {/* 主類別 */}
              <div className="flex flex-wrap gap-2">
                {INDIVIDUAL_CONCERNS.map((c) => {
                  const selected = form.presenting_concerns.some((pc) => pc.category === c.label);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          setField("presenting_concerns", form.presenting_concerns.filter((pc) => pc.category !== c.label));
                        } else {
                          setField("presenting_concerns", [...form.presenting_concerns, { category: c.label, items: [] }]);
                        }
                      }}
                      className={`font-sans text-xs px-3 py-1 border transition-colors ${
                        selected
                          ? "bg-forest/10 border-forest text-forest"
                          : "border-sand/30 text-muted hover:border-sand/60"
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              {/* 已選主類別的細項 */}
              {INDIVIDUAL_CONCERNS.filter((c) => form.presenting_concerns.some((pc) => pc.category === c.label) && c.items.length > 0).map((c) => {
                const entry = form.presenting_concerns.find((pc) => pc.category === c.label)!;
                return (
                  <div key={c.id} className="pl-3 border-l-2 border-forest/30 space-y-1.5">
                    <p className="font-sans text-[11px] text-forest font-medium">{c.label} — 細項</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {c.items.map((item) => {
                        const checked = entry.items.includes(item);
                        return (
                          <label key={item} className="flex items-center gap-1.5 cursor-pointer font-sans text-xs text-muted">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const newItems = checked
                                  ? entry.items.filter((i) => i !== item)
                                  : [...entry.items, item];
                                setField(
                                  "presenting_concerns",
                                  form.presenting_concerns.map((pc) =>
                                    pc.category === c.label ? { ...pc, items: newItems } : pc
                                  )
                                );
                              }}
                              className="w-3.5 h-3.5 border border-sand accent-forest"
                            />
                            {item}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 輔導語言 */}
            <div>
              <label className={labelCls}>輔導語言</label>
              <select value={form.native_language} onChange={(e) => setField("native_language", e.target.value)} className={inputCls}>
                <option value="">（未填寫）</option>
                <option value="cantonese">粵語</option>
                <option value="mandarin">普通話 / 國語</option>
                <option value="english">英語</option>
                <option value="other">其他</option>
              </select>
            </div>

            {/* 偏好晤談方式 */}
            <div>
              <label className={labelCls}>偏好晤談方式</label>
              <select value={form.preferred_meeting_type} onChange={(e) => setField("preferred_meeting_type", e.target.value)} className={inputCls}>
                <option value="">（未填寫）</option>
                <option value="face">面談</option>
                <option value="online">線上</option>
                <option value="both">面談或線上均可</option>
              </select>
            </div>
          </div>

          {/* 個人臨床資料 */}
          {form.service_type === "couple" && (
            <p className="font-sans text-[11px] text-muted/60 pt-1 border-t border-sand/15">以下為個人資料，不與伴侶共享</p>
          )}

          {/* 精神科就診史 */}
          <div>
            <label className={labelCls}>曾有精神科就診經驗</label>
            <div className="flex gap-6 mt-1">
              {[{ val: true, label: "有" }, { val: false, label: "沒有" }].map((opt) => (
                <label key={String(opt.val)} className="flex items-center gap-2 cursor-pointer font-sans text-sm text-muted">
                  <input
                    type="radio"
                    checked={form.has_psychiatry_history === opt.val}
                    onChange={() => setField("has_psychiatry_history", opt.val)}
                    className="w-4 h-4 border border-sand accent-forest"
                  />
                  {opt.label}
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer font-sans text-sm text-muted">
                <input
                  type="radio"
                  checked={form.has_psychiatry_history === null}
                  onChange={() => setField("has_psychiatry_history", null)}
                  className="w-4 h-4 border border-sand accent-forest"
                />
                未知
              </label>
            </div>
          </div>
          {form.has_psychiatry_history === true && (
            <div>
              <label className={labelCls}>精神科就診詳情</label>
              <textarea
                value={form.psychiatry_notes}
                onChange={(e) => setField("psychiatry_notes", e.target.value)}
                rows={3}
                className={inputCls + " resize-none"}
                placeholder="就診時間、診斷、用藥情況…"
              />
            </div>
          )}

          {/* 過往輔導/諮商經歷 */}
          <div>
            <label className={labelCls}>曾有接受心理輔導或諮商經驗</label>
            <div className="flex gap-6 mt-1">
              {[{ val: true, label: "有" }, { val: false, label: "沒有" }].map((opt) => (
                <label key={String(opt.val)} className="flex items-center gap-2 cursor-pointer font-sans text-sm text-muted">
                  <input
                    type="radio"
                    checked={form.has_prior_counseling === opt.val}
                    onChange={() => setField("has_prior_counseling", opt.val)}
                    className="w-4 h-4 border border-sand accent-forest"
                  />
                  {opt.label}
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer font-sans text-sm text-muted">
                <input
                  type="radio"
                  checked={form.has_prior_counseling === null}
                  onChange={() => setField("has_prior_counseling", null)}
                  className="w-4 h-4 border border-sand accent-forest"
                />
                未知
              </label>
            </div>
          </div>
          {form.has_prior_counseling === true && (
            <div>
              <label className={labelCls}>過往輔導詳情</label>
              <textarea
                value={form.prior_counseling_notes}
                onChange={(e) => setField("prior_counseling_notes", e.target.value)}
                rows={3}
                className={inputCls + " resize-none"}
                placeholder="接受時間、持續多久、結束原因…"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 居住城市 */}
            <div>
              <label className={labelCls}>居住城市</label>
              <input value={form.city} onChange={(e) => setField("city", e.target.value)} className={inputCls} placeholder="如：澳門" />
            </div>

            {/* 同意書簽署日期 */}
            <div>
              <label className={labelCls}>知情同意書簽署日期</label>
              <input type="date" value={form.consent_signed_at} onChange={(e) => setField("consent_signed_at", e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>
      )}

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
              <div className="ml-auto flex items-center gap-4">
                <button
                  onClick={archive}
                  className="font-sans text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  封存個案
                </button>
                {isDirector && (
                  <button
                    onClick={hardDelete}
                    className="font-sans text-xs text-red-600 hover:text-red-800 underline underline-offset-2 transition-colors"
                  >
                    永久刪除
                  </button>
                )}
              </div>
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
