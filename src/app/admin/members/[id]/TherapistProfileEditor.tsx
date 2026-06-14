"use client";

import { useRef, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ExperienceItem = { role: string; org: string; period: string };
type PublicationItem = { title: string; year?: string; note?: string };
type ServiceItem = { name: string; fee: string; duration?: string; note?: string };
type Socials = {
  instagram?: string;
  facebook?: string;
  threads?: string;
  xiaohongshu?: string;
};

type ProfileData = {
  id: string;
  name?: string;
  name_en?: string;
  bio?: string;
  photo_url?: string;
  title?: string;
  client_letter?: string;
  education: string[];
  specialties: string[];
  orientations: string[];
  socials: Socials;
  licenses: string[];
  associations: string[];
  experience: ExperienceItem[];
  training: string[];
  publications: PublicationItem[];
  services: ServiceItem[];
};

type TierRow = { threshold: number; rate: number };

type SessionRateData = {
  id?: string;
  commission_type: "percentage" | "tiered" | "flat_per_session" | "";
  commission_rate: string;
  flat_amount: string;
  free_sessions: string;
  tier_config: TierRow[];
  notes: string;
  effective_from: string;
};

type EventRateData = {
  id?: string;
  flat_amount: string;
  notes: string;
  effective_from: string;
};

type RateSaveState = { saving: boolean; saved: boolean; error: string };

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

const EMPTY_SESSION_RATE: SessionRateData = {
  commission_type: "",
  commission_rate: "",
  flat_amount: "",
  free_sessions: "0",
  tier_config: [],
  notes: "",
  effective_from: todayStr(),
};

const EMPTY_EVENT_RATE: EventRateData = {
  flat_amount: "",
  notes: "",
  effective_from: todayStr(),
};

type Props = {
  therapistId: string;
  initialData: ProfileData;
  userRole?: string;
};

function useDragList<T>(items: T[], onChange: (items: T[]) => void) {
  const dragIdx = useRef<number | null>(null);
  const onDragStart = (idx: number) => { dragIdx.current = idx; };
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === idx) return;
    const next = [...items];
    const [item] = next.splice(dragIdx.current, 1);
    next.splice(idx, 0, item);
    onChange(next);
    dragIdx.current = idx;
  };
  const onDragEnd = () => { dragIdx.current = null; };
  return { onDragStart, onDragOver, onDragEnd };
}

export default function TherapistProfileEditor({ therapistId, initialData, userRole }: Props) {
  const [data, setData] = useState<ProfileData>(initialData);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Commission rate state (session + event are independent)
  const isAdmin = userRole === "director" || userRole === "admin";
  const [sessionRate, setSessionRate] = useState<SessionRateData>({ ...EMPTY_SESSION_RATE });
  const [eventRate, setEventRate] = useState<EventRateData>({ ...EMPTY_EVENT_RATE });
  const [sessionSave, setSessionSave] = useState<RateSaveState>({ saving: false, saved: false, error: "" });
  const [eventSave, setEventSave] = useState<RateSaveState>({ saving: false, saved: false, error: "" });

  useEffect(() => {
    if (!isAdmin) return;
    fetch(`/api/admin/salary/rates/${therapistId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d: { session: Record<string, unknown> | null; event: Record<string, unknown> | null } | null) => {
        if (!d) return;
        if (d.session) {
          const s = d.session;
          setSessionRate({
            id: s.id as string,
            commission_type: (s.commission_type as SessionRateData["commission_type"]) ?? "",
            commission_rate: s.commission_rate != null ? String(Math.round((s.commission_rate as number) * 100)) : "",
            flat_amount: s.flat_amount != null ? String(s.flat_amount) : "",
            free_sessions: String((s.free_sessions as number) ?? 0),
            tier_config: ((s.tier_config ?? []) as TierRow[]).map((t) => ({
              threshold: t.threshold,
              rate: Math.round(t.rate * 100),
            })),
            notes: (s.notes as string) ?? "",
            effective_from: (s.effective_from as string) ?? todayStr(),
          });
        }
        if (d.event) {
          const e = d.event;
          setEventRate({
            id: e.id as string,
            flat_amount: e.flat_amount != null ? String(e.flat_amount) : "",
            notes: (e.notes as string) ?? "",
            effective_from: (e.effective_from as string) ?? todayStr(),
          });
        }
      })
      .catch(() => {});
  }, [therapistId, isAdmin]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("therapist_profiles")
      .upsert({ ...data, id: therapistId, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) {
      setSaveError(error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const saveSessionRate = async () => {
    if (!sessionRate.commission_type) {
      setSessionSave((s) => ({ ...s, error: "請選擇抽成模式" }));
      return;
    }
    setSessionSave({ saving: true, saved: false, error: "" });
    try {
      const payload: Record<string, unknown> = {
        commission_type: sessionRate.commission_type,
        notes: sessionRate.notes || null,
        effective_from: sessionRate.effective_from || todayStr(),
      };
      if (sessionRate.commission_type === "percentage") {
        const pct = parseFloat(sessionRate.commission_rate);
        if (isNaN(pct) || pct <= 0 || pct > 100) {
          setSessionSave((s) => ({ ...s, saving: false, error: "請輸入 1–100 的百分比" }));
          return;
        }
        payload.commission_rate = pct / 100;
      } else if (sessionRate.commission_type === "flat_per_session") {
        payload.flat_amount = parseFloat(sessionRate.flat_amount) || null;
        payload.free_sessions = parseInt(sessionRate.free_sessions) || 0;
      } else if (sessionRate.commission_type === "tiered") {
        if (sessionRate.tier_config.length === 0) {
          setSessionSave((s) => ({ ...s, saving: false, error: "請至少新增一個階梯" }));
          return;
        }
        payload.tier_config = sessionRate.tier_config.map((t) => ({
          threshold: t.threshold,
          rate: t.rate / 100,
        }));
      }
      const res = await fetch(`/api/admin/salary/rates/${therapistId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setSessionSave((s) => ({ ...s, saving: false, error: json.error ?? "發生錯誤" }));
        return;
      }
      setSessionRate((r) => ({ ...r, id: json.id }));
      setSessionSave({ saving: false, saved: true, error: "" });
      setTimeout(() => setSessionSave((s) => ({ ...s, saved: false })), 3000);
    } catch {
      setSessionSave((s) => ({ ...s, saving: false, error: "網路錯誤" }));
    }
  };

  const saveEventRate = async () => {
    const amt = parseFloat(eventRate.flat_amount);
    if (isNaN(amt) || amt <= 0) {
      setEventSave((s) => ({ ...s, error: "請輸入有效的報酬金額" }));
      return;
    }
    setEventSave({ saving: true, saved: false, error: "" });
    try {
      const payload = {
        commission_type: "event",
        flat_amount: amt,
        notes: eventRate.notes || null,
        effective_from: eventRate.effective_from || todayStr(),
      };
      const res = await fetch(`/api/admin/salary/rates/${therapistId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setEventSave((s) => ({ ...s, saving: false, error: json.error ?? "發生錯誤" }));
        return;
      }
      setEventRate((r) => ({ ...r, id: json.id }));
      setEventSave({ saving: false, saved: true, error: "" });
      setTimeout(() => setEventSave((s) => ({ ...s, saved: false })), 3000);
    } catch {
      setEventSave((s) => ({ ...s, saving: false, error: "網路錯誤" }));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${therapistId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("member-photos")
      .upload(path, file, { upsert: true });
    if (error) {
      setUploadError(error.message);
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage
      .from("member-photos")
      .getPublicUrl(path);
    setData((p) => ({ ...p, photo_url: publicUrl }));
    setUploading(false);
  };

  const setStringArray =
    (field: keyof Pick<ProfileData, "education" | "licenses" | "associations" | "training" | "specialties" | "orientations">) =>
    (value: string[]) =>
      setData((prev) => ({ ...prev, [field]: value }));

  const setSocial = (key: keyof Socials) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData((prev) => ({ ...prev, socials: { ...prev.socials, [key]: e.target.value } }));

  const expDrag = useDragList(data.experience, (v) => setData((p) => ({ ...p, experience: v })));
  const pubDrag = useDragList(data.publications, (v) => setData((p) => ({ ...p, publications: v })));
  const svcDrag = useDragList(data.services, (v) => setData((p) => ({ ...p, services: v })));

  return (
    <div className="space-y-8">
      {/* 基本資料 */}
      <Section title="基本資料">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-sans text-xs text-muted mb-1">姓名</label>
            <input
              value={data.name ?? ""}
              onChange={(e) => setData((p) => ({ ...p, name: e.target.value }))}
              placeholder="例如：唐國章"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block font-sans text-xs text-muted mb-1">英文名 / 花名</label>
            <input
              value={data.name_en ?? ""}
              onChange={(e) => setData((p) => ({ ...p, name_en: e.target.value }))}
              placeholder="例如：Tanky"
              className={inputCls}
            />
          </div>
        </div>

        {/* 照片上傳 */}
        <div className="mt-3">
          <label className="block font-sans text-xs text-muted mb-2">照片</label>
          <div className="flex items-start gap-4">
            {data.photo_url ? (
              <div className="w-20 h-28 flex-shrink-0 overflow-hidden border border-sand/20 bg-sand/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.photo_url} alt="目前照片" className="w-full h-full object-cover object-top" />
              </div>
            ) : (
              <div className="w-20 h-28 flex-shrink-0 border border-dashed border-sand/30 bg-sand/5 flex items-center justify-center">
                <span className="font-sans text-[10px] text-sand/40">無相片</span>
              </div>
            )}
            <div className="space-y-2 flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 border border-sand/30 font-sans text-xs text-deep hover:border-forest hover:text-forest transition-colors disabled:opacity-50 cursor-pointer"
              >
                {uploading ? "上傳中…" : data.photo_url ? "更換照片" : "上傳照片"}
              </button>
              {data.photo_url && (
                <button
                  type="button"
                  onClick={() => setData((p) => ({ ...p, photo_url: "" }))}
                  className="block font-sans text-xs text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                >
                  移除照片
                </button>
              )}
              {uploadError && (
                <p className="font-sans text-xs text-red-500">{uploadError}</p>
              )}
              <p className="font-sans text-[11px] text-sand/50">支援 JPG、PNG、WebP，建議比例 3:4</p>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <label className="block font-sans text-xs text-muted mb-1">簡介（SEO 用）</label>
          <textarea
            value={data.bio ?? ""}
            onChange={(e) => setData((p) => ({ ...p, bio: e.target.value }))}
            rows={3}
            placeholder="一段簡短的自我介紹，用於搜尋引擎描述……"
            className={cn(inputCls, "resize-y")}
          />
        </div>
      </Section>

      {/* 頭銜 */}
      <Section title="頭銜">
        <input
          value={data.title ?? ""}
          onChange={(e) => setData((p) => ({ ...p, title: e.target.value }))}
          placeholder="例如：心理輔導師 & 專業督導"
          className={inputCls}
        />
      </Section>

      {/* 給來訪者的一封信 */}
      <Section title="給來訪者的一封信">
        <textarea
          value={data.client_letter ?? ""}
          onChange={(e) => setData((p) => ({ ...p, client_letter: e.target.value }))}
          rows={6}
          placeholder="寫一封給正在考慮接受諮商的來訪者的信……"
          className={cn(inputCls, "resize-y leading-relaxed")}
        />
      </Section>

      {/* 學歷 */}
      <Section title="學歷">
        <SortableStringList
          items={data.education}
          onChange={setStringArray("education")}
          placeholder="例如：國立清華大學 教育心理與諮商博士生"
        />
      </Section>

      {/* 擅長議題 */}
      <Section title="擅長議題">
        <SortableStringList
          items={data.specialties}
          onChange={setStringArray("specialties")}
          placeholder="例如：抑鬱焦慮、親密關係、性別認同"
        />
      </Section>

      {/* 諮商取向 */}
      <Section title="諮商取向">
        <SortableStringList
          items={data.orientations}
          onChange={setStringArray("orientations")}
          placeholder="例如：認知行為治療 (CBT)、人本取向"
        />
      </Section>

      {/* 社交媒體 */}
      <Section title="社交媒體">
        <div className="space-y-2">
          {(
            [
              { key: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/yourhandle/" },
              { key: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/yourpage" },
              { key: "threads", label: "Threads", placeholder: "https://www.threads.net/@yourhandle" },
              { key: "xiaohongshu", label: "小紅書", placeholder: "小紅書個人主頁連結" },
            ] as { key: keyof Socials; label: string; placeholder: string }[]
          ).map(({ key, label, placeholder }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="font-sans text-xs text-muted w-20 flex-shrink-0">{label}</span>
              <input
                value={data.socials?.[key] ?? ""}
                onChange={setSocial(key)}
                placeholder={placeholder}
                className={cn(inputCls, "flex-1")}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* 專業證照 */}
      <Section title="專業證照">
        <SortableStringList
          items={data.licenses}
          onChange={setStringArray("licenses")}
          placeholder="例如：台灣諮商心理師證書 No.12345"
        />
      </Section>

      {/* 專業學會 */}
      <Section title="專業學會">
        <SortableStringList
          items={data.associations}
          onChange={setStringArray("associations")}
          placeholder="例如：台灣輔導與諮商學會"
        />
      </Section>

      {/* 實務經驗 */}
      <Section title="實務經驗">
        <div className="space-y-3">
          {data.experience.map((exp, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => expDrag.onDragStart(idx)}
              onDragOver={(e) => expDrag.onDragOver(e, idx)}
              onDragEnd={expDrag.onDragEnd}
              className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 items-center"
            >
              <DragHandle />
              <input value={exp.role} onChange={(e) => { const u = [...data.experience]; u[idx] = { ...u[idx], role: e.target.value }; setData((p) => ({ ...p, experience: u })); }} placeholder="職稱" className={inputCls} />
              <input value={exp.org} onChange={(e) => { const u = [...data.experience]; u[idx] = { ...u[idx], org: e.target.value }; setData((p) => ({ ...p, experience: u })); }} placeholder="機構" className={inputCls} />
              <input value={exp.period} onChange={(e) => { const u = [...data.experience]; u[idx] = { ...u[idx], period: e.target.value }; setData((p) => ({ ...p, experience: u })); }} placeholder="2019–至今" className={cn(inputCls, "w-28")} />
              <RemoveBtn onClick={() => setData((p) => ({ ...p, experience: p.experience.filter((_, i) => i !== idx) }))} />
            </div>
          ))}
          <AddBtn onClick={() => setData((p) => ({ ...p, experience: [...p.experience, { role: "", org: "", period: "" }] }))} label="+ 新增經驗" />
        </div>
      </Section>

      {/* 專業訓練 */}
      <Section title="專業訓練">
        <SortableStringList
          items={data.training}
          onChange={setStringArray("training")}
          placeholder="例如：認知行為治療 (CBT) 進階培訓，2023"
        />
      </Section>

      {/* 著作與出版 */}
      <Section title="著作與出版">
        <div className="space-y-3">
          {data.publications.map((pub, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => pubDrag.onDragStart(idx)}
              onDragOver={(e) => pubDrag.onDragOver(e, idx)}
              onDragEnd={pubDrag.onDragEnd}
              className="grid grid-cols-[auto_2fr_auto_1fr_auto] gap-2 items-start"
            >
              <DragHandle />
              <input value={pub.title} onChange={(e) => { const u = [...data.publications]; u[idx] = { ...u[idx], title: e.target.value }; setData((p) => ({ ...p, publications: u })); }} placeholder="著作標題" className={inputCls} />
              <input value={pub.year ?? ""} onChange={(e) => { const u = [...data.publications]; u[idx] = { ...u[idx], year: e.target.value }; setData((p) => ({ ...p, publications: u })); }} placeholder="年份" className={cn(inputCls, "w-20")} />
              <input value={pub.note ?? ""} onChange={(e) => { const u = [...data.publications]; u[idx] = { ...u[idx], note: e.target.value }; setData((p) => ({ ...p, publications: u })); }} placeholder="備註（期刊、出版社等）" className={inputCls} />
              <RemoveBtn onClick={() => setData((p) => ({ ...p, publications: p.publications.filter((_, i) => i !== idx) }))} />
            </div>
          ))}
          <AddBtn onClick={() => setData((p) => ({ ...p, publications: [...p.publications, { title: "" }] }))} label="+ 新增著作" />
        </div>
      </Section>

      {/* 服務與收費 */}
      <Section title="服務與收費">
        <div className="space-y-3">
          {data.services.map((svc, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => svcDrag.onDragStart(idx)}
              onDragOver={(e) => svcDrag.onDragOver(e, idx)}
              onDragEnd={svcDrag.onDragEnd}
              className="grid grid-cols-[auto_2fr_1fr_1fr_auto] gap-2 items-start"
            >
              <DragHandle />
              <input value={svc.name} onChange={(e) => { const u = [...data.services]; u[idx] = { ...u[idx], name: e.target.value }; setData((p) => ({ ...p, services: u })); }} placeholder="服務名稱" className={inputCls} />
              <input value={svc.fee} onChange={(e) => { const u = [...data.services]; u[idx] = { ...u[idx], fee: e.target.value }; setData((p) => ({ ...p, services: u })); }} placeholder="MOP 800" className={inputCls} />
              <input value={svc.duration ?? ""} onChange={(e) => { const u = [...data.services]; u[idx] = { ...u[idx], duration: e.target.value }; setData((p) => ({ ...p, services: u })); }} placeholder="50 分鐘" className={inputCls} />
              <RemoveBtn onClick={() => setData((p) => ({ ...p, services: p.services.filter((_, i) => i !== idx) }))} />
            </div>
          ))}
          <AddBtn onClick={() => setData((p) => ({ ...p, services: [...p.services, { name: "", fee: "" }] }))} label="+ 新增服務" />
        </div>
      </Section>

      {/* ── 常規諮商抽成（行政/所長可見） ── */}
      {isAdmin && (
        <Section title="常規諮商抽成">
          <p className="font-sans text-[11px] text-muted/70 -mt-1">
            適用於個人諮商、評估等常規晤談。與講座抽成並行，各自獨立設定。
          </p>

          {/* Effective from */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-sans text-xs text-muted mb-1">生效日期</label>
              <input
                type="date"
                value={sessionRate.effective_from}
                onChange={(e) => setSessionRate((r) => ({ ...r, effective_from: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block font-sans text-xs text-muted mb-1">抽成模式</label>
              <select
                value={sessionRate.commission_type}
                onChange={(e) =>
                  setSessionRate((r) => ({
                    ...r,
                    commission_type: e.target.value as SessionRateData["commission_type"],
                  }))
                }
                className={inputCls}
              >
                <option value="">（未設定）</option>
                <option value="percentage">固定比例</option>
                <option value="tiered">階梯式（依月份累計總堂數）</option>
                <option value="flat_per_session">每次固定金額</option>
              </select>
            </div>
          </div>

          {/* percentage */}
          {sessionRate.commission_type === "percentage" && (
            <div>
              <label className="block font-sans text-xs text-muted mb-1">心理師分成比例（%）</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={sessionRate.commission_rate}
                  onChange={(e) => setSessionRate((r) => ({ ...r, commission_rate: e.target.value }))}
                  className={cn(inputCls, "w-28")}
                  placeholder="70"
                />
                <span className="font-sans text-xs text-muted">%</span>
                {sessionRate.commission_rate && !isNaN(+sessionRate.commission_rate) && (
                  <span className="font-sans text-[11px] text-muted/60">
                    → 每收 MOP 600，心理師得 MOP {Math.round(600 * +sessionRate.commission_rate / 100)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* flat_per_session */}
          {sessionRate.commission_type === "flat_per_session" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-sans text-xs text-muted mb-1">每堂固定金額（MOP）</label>
                <input
                  type="number"
                  min={0}
                  value={sessionRate.flat_amount}
                  onChange={(e) => setSessionRate((r) => ({ ...r, flat_amount: e.target.value }))}
                  className={inputCls}
                  placeholder="400"
                />
              </div>
              <div>
                <label className="block font-sans text-xs text-muted mb-1">前 N 堂免費（0 = 每堂計算）</label>
                <input
                  type="number"
                  min={0}
                  value={sessionRate.free_sessions}
                  onChange={(e) => setSessionRate((r) => ({ ...r, free_sessions: e.target.value }))}
                  className={inputCls}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {/* tiered */}
          {sessionRate.commission_type === "tiered" && (
            <div className="space-y-3">
              <p className="font-sans text-[11px] text-muted/70">
                以<strong>月份內跨所有個案的累計總堂數</strong>決定適用比例。例：第 1–9 堂 60%，第 10 堂起 70%。
              </p>
              <div className="space-y-2">
                {sessionRate.tier_config.map((tier, idx) => (
                  <div key={idx} className="flex items-center gap-2 flex-wrap">
                    <span className="font-sans text-[11px] text-muted flex-shrink-0">達第</span>
                    <input
                      type="number"
                      min={1}
                      value={tier.threshold}
                      onChange={(e) => {
                        const u = [...sessionRate.tier_config];
                        u[idx] = { ...u[idx], threshold: +e.target.value };
                        setSessionRate((r) => ({ ...r, tier_config: u }));
                      }}
                      className={cn(inputCls, "w-20")}
                      placeholder="10"
                    />
                    <span className="font-sans text-[11px] text-muted flex-shrink-0">堂後，心理師得</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={tier.rate}
                      onChange={(e) => {
                        const u = [...sessionRate.tier_config];
                        u[idx] = { ...u[idx], rate: +e.target.value };
                        setSessionRate((r) => ({ ...r, tier_config: u }));
                      }}
                      className={cn(inputCls, "w-20")}
                      placeholder="70"
                    />
                    <span className="font-sans text-[11px] text-muted flex-shrink-0">%</span>
                    <RemoveBtn
                      onClick={() =>
                        setSessionRate((r) => ({
                          ...r,
                          tier_config: r.tier_config.filter((_, i) => i !== idx),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
              <AddBtn
                onClick={() =>
                  setSessionRate((r) => ({
                    ...r,
                    tier_config: [
                      ...r.tier_config,
                      { threshold: (r.tier_config.at(-1)?.threshold ?? 0) + 10, rate: 70 },
                    ],
                  }))
                }
                label="+ 新增階梯"
              />
              {/* Preview */}
              {sessionRate.tier_config.length > 0 && (
                <div className="bg-sand/10 px-3 py-2 font-sans text-[11px] text-muted space-y-0.5">
                  {(() => {
                    const sorted = [...sessionRate.tier_config].sort((a, b) => a.threshold - b.threshold);
                    return sorted.map((t, i) => {
                      const from = i === 0 ? 1 : sorted[i - 1].threshold;
                      const to = t.threshold - 1;
                      const next = sorted[i + 1];
                      return (
                        <p key={i}>
                          {i === 0 && from < t.threshold && (
                            <span>第 1–{to} 堂：（未達門檻，視前一設定）　</span>
                          )}
                          第 {t.threshold} 堂起{next ? `（至第 ${next.threshold - 1} 堂）` : "（含以後）"}：心理師得 {t.rate}%
                        </p>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {sessionRate.commission_type && (
            <div>
              <label className="block font-sans text-xs text-muted mb-1">備註（選填）</label>
              <input
                value={sessionRate.notes}
                onChange={(e) => setSessionRate((r) => ({ ...r, notes: e.target.value }))}
                className={inputCls}
                placeholder="例：2025年合約調整"
              />
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={saveSessionRate}
              disabled={sessionSave.saving || !sessionRate.commission_type}
              className="px-5 py-2 bg-deep text-paper font-sans text-xs hover:bg-forest transition-colors disabled:opacity-40 cursor-pointer"
            >
              {sessionSave.saving ? "儲存中…" : "儲存常規抽成"}
            </button>
            {sessionSave.saved && <span className="font-sans text-xs text-forest">已儲存 ✓</span>}
            {sessionSave.error && <span className="font-sans text-xs text-red-500">{sessionSave.error}</span>}
          </div>
          {sessionRate.id && (
            <p className="font-sans text-[10px] text-muted/40">
              目前設定生效中。儲存後舊版本自動關閉，歷史紀錄保留於資料庫。
            </p>
          )}
        </Section>
      )}

      {/* ── 講座 / 工作坊抽成（與常規並行，獨立設定） ── */}
      {isAdmin && (
        <Section title="講座 / 工作坊抽成">
          <p className="font-sans text-[11px] text-muted/70 -mt-1">
            與常規諮商抽成<strong>並行獨立</strong>，不互相影響。適用於講座、工作坊、培訓等活動，每場固定報酬。
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-sans text-xs text-muted mb-1">生效日期</label>
              <input
                type="date"
                value={eventRate.effective_from}
                onChange={(e) => setEventRate((r) => ({ ...r, effective_from: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block font-sans text-xs text-muted mb-1">每場固定報酬（MOP）</label>
              <input
                type="number"
                min={0}
                value={eventRate.flat_amount}
                onChange={(e) => setEventRate((r) => ({ ...r, flat_amount: e.target.value }))}
                className={inputCls}
                placeholder="1500"
              />
            </div>
          </div>

          <div>
            <label className="block font-sans text-xs text-muted mb-1">備註（選填）</label>
            <input
              value={eventRate.notes}
              onChange={(e) => setEventRate((r) => ({ ...r, notes: e.target.value }))}
              className={inputCls}
              placeholder="例：半天講座 MOP 1500，全天 MOP 2500"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={saveEventRate}
              disabled={eventSave.saving}
              className="px-5 py-2 bg-deep text-paper font-sans text-xs hover:bg-forest transition-colors disabled:opacity-40 cursor-pointer"
            >
              {eventSave.saving ? "儲存中…" : "儲存講座抽成"}
            </button>
            {eventSave.saved && <span className="font-sans text-xs text-forest">已儲存 ✓</span>}
            {eventSave.error && <span className="font-sans text-xs text-red-500">{eventSave.error}</span>}
          </div>
          {eventRate.id && (
            <p className="font-sans text-[10px] text-muted/40">
              目前設定生效中。儲存後舊版本自動關閉，歷史紀錄保留於資料庫。
            </p>
          )}
        </Section>
      )}

      {/* Save */}
      <div className="pt-4 border-t border-sand/20 space-y-3">
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="px-6 py-2.5 bg-forest text-paper font-sans text-xs tracking-widest hover:bg-deep transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? "儲存中…" : "儲存"}
          </button>
          {saved && <span className="font-sans text-xs text-forest">已儲存 ✓</span>}
        </div>
        {saveError && (
          <div className="p-3 bg-red-50 border border-red-200 font-sans text-xs text-red-600">
            <strong>儲存失敗：</strong>{saveError}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 bg-white p-6 border border-sand/15">
      <h2 className="font-serif text-deep text-base border-b border-sand/15 pb-2">{title}</h2>
      {children}
    </div>
  );
}

function SortableStringList({ items, onChange, placeholder }: { items: string[]; onChange: (val: string[]) => void; placeholder: string }) {
  const { onDragStart, onDragOver, onDragEnd } = useDragList(items, onChange);
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} draggable onDragStart={() => onDragStart(idx)} onDragOver={(e) => onDragOver(e, idx)} onDragEnd={onDragEnd} className="flex gap-2 items-center">
          <DragHandle />
          <input value={item} onChange={(e) => { const u = [...items]; u[idx] = e.target.value; onChange(u); }} placeholder={placeholder} className={cn(inputCls, "flex-1")} />
          <RemoveBtn onClick={() => onChange(items.filter((_, i) => i !== idx))} />
        </div>
      ))}
      <AddBtn onClick={() => onChange([...items, ""])} label="+ 新增" />
    </div>
  );
}

function DragHandle() {
  return <span className="text-sand/40 hover:text-sand cursor-grab active:cursor-grabbing select-none px-1 text-sm leading-none" title="拖拉排序">⠿</span>;
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className="font-sans text-xs text-muted hover:text-forest transition-colors cursor-pointer">{label}</button>;
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="text-sand/60 hover:text-red-400 transition-colors text-sm cursor-pointer px-1" aria-label="移除">×</button>;
}

const inputCls = "border border-sand/25 bg-soft/30 px-3 py-2 font-sans text-xs text-deep focus:outline-none focus:border-forest transition-colors w-full";
