"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ExperienceItem = { role: string; org: string; period: string };
type PublicationItem = { title: string; year?: string; note?: string };
type ServiceItem = { name: string; fee: string; duration?: string; note?: string };

type ProfileData = {
  id: string;
  licenses: string[];
  associations: string[];
  experience: ExperienceItem[];
  training: string[];
  publications: PublicationItem[];
  services: ServiceItem[];
};

type Props = {
  therapistId: string;
  initialData: ProfileData;
};

export default function TherapistProfileEditor({ therapistId, initialData }: Props) {
  const [data, setData] = useState<ProfileData>(initialData);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    await supabase
      .from("therapist_profiles")
      .upsert({ ...data, id: therapistId, updated_at: new Date().toISOString() });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // --- helpers for simple string arrays ---
  const setStringArray = (field: keyof Pick<ProfileData, "licenses" | "associations" | "training">) =>
    (value: string[]) => setData((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-8">
      {/* 證照 */}
      <Section title="專業證照">
        <StringList
          items={data.licenses}
          onChange={setStringArray("licenses")}
          placeholder="例如：台灣諮商心理師證書 No.12345"
        />
      </Section>

      {/* 學會 */}
      <Section title="專業學會">
        <StringList
          items={data.associations}
          onChange={setStringArray("associations")}
          placeholder="例如：台灣輔導與諮商學會"
        />
      </Section>

      {/* 實務經驗 */}
      <Section title="實務經驗">
        <div className="space-y-3">
          {data.experience.map((exp, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
              <input
                value={exp.role}
                onChange={(e) => {
                  const updated = [...data.experience];
                  updated[idx] = { ...updated[idx], role: e.target.value };
                  setData((p) => ({ ...p, experience: updated }));
                }}
                placeholder="職稱"
                className={inputCls}
              />
              <input
                value={exp.org}
                onChange={(e) => {
                  const updated = [...data.experience];
                  updated[idx] = { ...updated[idx], org: e.target.value };
                  setData((p) => ({ ...p, experience: updated }));
                }}
                placeholder="機構"
                className={inputCls}
              />
              <input
                value={exp.period}
                onChange={(e) => {
                  const updated = [...data.experience];
                  updated[idx] = { ...updated[idx], period: e.target.value };
                  setData((p) => ({ ...p, experience: updated }));
                }}
                placeholder="期間，如 2019–至今"
                className={cn(inputCls, "w-36")}
              />
              <RemoveBtn onClick={() => setData((p) => ({ ...p, experience: p.experience.filter((_, i) => i !== idx) }))} />
            </div>
          ))}
          <AddBtn onClick={() => setData((p) => ({ ...p, experience: [...p.experience, { role: "", org: "", period: "" }] }))} label="+ 新增經驗" />
        </div>
      </Section>

      {/* 訓練 */}
      <Section title="專業訓練">
        <StringList
          items={data.training}
          onChange={setStringArray("training")}
          placeholder="例如：認知行為治療 (CBT) 進階培訓，2023"
        />
      </Section>

      {/* 著作 */}
      <Section title="著作與出版">
        <div className="space-y-3">
          {data.publications.map((pub, idx) => (
            <div key={idx} className="grid grid-cols-[2fr_auto_1fr_auto] gap-2 items-start">
              <input
                value={pub.title}
                onChange={(e) => {
                  const updated = [...data.publications];
                  updated[idx] = { ...updated[idx], title: e.target.value };
                  setData((p) => ({ ...p, publications: updated }));
                }}
                placeholder="著作標題"
                className={inputCls}
              />
              <input
                value={pub.year ?? ""}
                onChange={(e) => {
                  const updated = [...data.publications];
                  updated[idx] = { ...updated[idx], year: e.target.value };
                  setData((p) => ({ ...p, publications: updated }));
                }}
                placeholder="年份"
                className={cn(inputCls, "w-20")}
              />
              <input
                value={pub.note ?? ""}
                onChange={(e) => {
                  const updated = [...data.publications];
                  updated[idx] = { ...updated[idx], note: e.target.value };
                  setData((p) => ({ ...p, publications: updated }));
                }}
                placeholder="備註（期刊、出版社等）"
                className={inputCls}
              />
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
            <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-start">
              <input
                value={svc.name}
                onChange={(e) => {
                  const updated = [...data.services];
                  updated[idx] = { ...updated[idx], name: e.target.value };
                  setData((p) => ({ ...p, services: updated }));
                }}
                placeholder="服務名稱"
                className={inputCls}
              />
              <input
                value={svc.fee}
                onChange={(e) => {
                  const updated = [...data.services];
                  updated[idx] = { ...updated[idx], fee: e.target.value };
                  setData((p) => ({ ...p, services: updated }));
                }}
                placeholder="收費，如 MOP 800"
                className={inputCls}
              />
              <input
                value={svc.duration ?? ""}
                onChange={(e) => {
                  const updated = [...data.services];
                  updated[idx] = { ...updated[idx], duration: e.target.value };
                  setData((p) => ({ ...p, services: updated }));
                }}
                placeholder="時長，如 50 分鐘"
                className={inputCls}
              />
              <RemoveBtn onClick={() => setData((p) => ({ ...p, services: p.services.filter((_, i) => i !== idx) }))} />
            </div>
          ))}
          <AddBtn onClick={() => setData((p) => ({ ...p, services: [...p.services, { name: "", fee: "" }] }))} label="+ 新增服務" />
        </div>
      </Section>

      {/* Save */}
      <div className="flex items-center gap-4 pt-4 border-t border-sand/20">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-forest text-paper font-sans text-xs tracking-widest hover:bg-deep transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? "儲存中…" : "儲存"}
        </button>
        {saved && <span className="font-sans text-xs text-forest">已儲存 ✓</span>}
      </div>
    </div>
  );
}

// ---- Sub-components ----

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 bg-white p-6 border border-sand/15">
      <h2 className="font-serif text-deep text-base border-b border-sand/15 pb-2">{title}</h2>
      {children}
    </div>
  );
}

function StringList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (val: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-2">
          <input
            value={item}
            onChange={(e) => {
              const updated = [...items];
              updated[idx] = e.target.value;
              onChange(updated);
            }}
            placeholder={placeholder}
            className={cn(inputCls, "flex-1")}
          />
          <RemoveBtn onClick={() => onChange(items.filter((_, i) => i !== idx))} />
        </div>
      ))}
      <AddBtn onClick={() => onChange([...items, ""])} label="+ 新增" />
    </div>
  );
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-sans text-xs text-muted hover:text-forest transition-colors cursor-pointer"
    >
      {label}
    </button>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sand/60 hover:text-red-400 transition-colors text-sm cursor-pointer px-1"
      aria-label="移除"
    >
      ×
    </button>
  );
}

const inputCls =
  "border border-sand/25 bg-soft/30 px-3 py-2 font-sans text-xs text-deep focus:outline-none focus:border-forest transition-colors w-full";
