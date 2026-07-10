"use client";

import { useState, useEffect, useCallback } from "react";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price_per_session: number;
  currency: string;
  session_count: number | null;
  age_min: number | null;
  age_max: number | null;
  sort_order: number;
  is_active: boolean;
};

type FormData = {
  name: string;
  description: string;
  price_per_session: string;
  currency: string;
  session_count: string;
  age_min: string;
  age_max: string;
  sort_order: string;
};

type Modal = { mode: "closed" } | { mode: "add" } | { mode: "edit"; plan: Plan };

function emptyForm(): FormData {
  return {
    name: "",
    description: "",
    price_per_session: "",
    currency: "MOP",
    session_count: "",
    age_min: "",
    age_max: "",
    sort_order: "0",
  };
}

const inputCls = "w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50";

export default function ServicePlansClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState<Modal>({ mode: "closed" });
  const [form, setForm] = useState<FormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    // Fetch all plans including inactive via ?all=1
    const res = await fetch("/api/admin/service-plans?all=1");
    if (res.ok) setPlans(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = plans.filter((p) => showInactive || p.is_active);

  function openAdd() {
    setForm(emptyForm());
    setModal({ mode: "add" });
    setErr("");
  }

  function openEdit(p: Plan) {
    setForm({
      name: p.name,
      description: p.description ?? "",
      price_per_session: String(p.price_per_session),
      currency: p.currency,
      session_count: p.session_count != null ? String(p.session_count) : "",
      age_min: p.age_min != null ? String(p.age_min) : "",
      age_max: p.age_max != null ? String(p.age_max) : "",
      sort_order: String(p.sort_order),
    });
    setModal({ mode: "edit", plan: p });
    setErr("");
  }

  function buildPayload(f: FormData) {
    return {
      name: f.name.trim(),
      description: f.description.trim() || null,
      price_per_session: parseFloat(f.price_per_session) || 0,
      currency: f.currency,
      session_count: f.session_count ? parseInt(f.session_count) : null,
      age_min: f.age_min ? parseInt(f.age_min) : null,
      age_max: f.age_max ? parseInt(f.age_max) : null,
      sort_order: parseInt(f.sort_order) || 0,
    };
  }

  async function save() {
    if (!form.name.trim()) { setErr("請填寫方案名稱"); return; }
    if (!form.price_per_session || parseFloat(form.price_per_session) <= 0) {
      setErr("請填寫有效的每次收費");
      return;
    }

    setSaving(true);
    setErr("");
    try {
      const isEdit = modal.mode === "edit";
      const url = isEdit ? `/api/admin/service-plans/${modal.plan.id}` : "/api/admin/service-plans";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      });
      if (!res.ok) {
        const j = await res.json();
        setErr(j.error ?? "發生錯誤");
        return;
      }
      setModal({ mode: "closed" });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(plan: Plan) {
    await fetch(`/api/admin/service-plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !plan.is_active }),
    });
    await load();
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-deep text-2xl">服務方案設定</h1>
          <p className="font-sans text-xs text-muted mt-0.5">
            管理諮商收費方案，可在預約派案時指定方案。
          </p>
        </div>
        <button
          onClick={openAdd}
          className="font-sans text-xs bg-deep text-paper px-4 py-2 hover:bg-forest transition-colors flex-shrink-0"
        >
          + 新增方案
        </button>
      </div>

      <label className="flex items-center gap-2 font-sans text-xs text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="accent-forest"
        />
        顯示已停用方案
      </label>

      {/* Table */}
      <div className="bg-white border border-sand/20 overflow-hidden">
        {visible.length === 0 ? (
          <div className="py-16 text-center font-sans text-xs text-muted/40">
            尚未建立任何服務方案。
          </div>
        ) : (
          <table className="w-full font-sans text-xs">
            <thead>
              <tr className="border-b border-sand/20 bg-sand/5">
                <th className="text-left text-muted px-4 py-3 font-normal">方案名稱</th>
                <th className="text-right text-muted px-4 py-3 font-normal">每次收費</th>
                <th className="text-center text-muted px-4 py-3 font-normal">次數</th>
                <th className="text-center text-muted px-4 py-3 font-normal">年齡限制</th>
                <th className="text-center text-muted px-4 py-3 font-normal">狀態</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id} className={`border-b border-sand/10 last:border-0 ${!p.is_active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="text-deep font-medium">{p.name}</p>
                    {p.description && (
                      <p className="text-muted/60 mt-0.5">{p.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-deep font-medium">
                    {p.currency} {p.price_per_session.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center text-muted">
                    {p.session_count != null ? `${p.session_count} 次` : "不限"}
                  </td>
                  <td className="px-4 py-3 text-center text-muted">
                    {p.age_min != null || p.age_max != null
                      ? `${p.age_min ?? ""}—${p.age_max ?? ""}歲`
                      : "無限制"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-[10px] ${p.is_active ? "bg-green-50 text-green-700" : "bg-sand/20 text-muted"}`}>
                      {p.is_active ? "啟用中" : "已停用"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-muted hover:text-deep transition-colors cursor-pointer"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => toggleActive(p)}
                        className={`transition-colors cursor-pointer ${p.is_active ? "text-sand/60 hover:text-red-400" : "text-sand/60 hover:text-green-600"}`}
                      >
                        {p.is_active ? "停用" : "啟用"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal.mode !== "closed" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md space-y-4 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-deep text-lg">
                {modal.mode === "add" ? "新增方案" : "編輯方案"}
              </h2>
              <button
                onClick={() => setModal({ mode: "closed" })}
                className="text-muted hover:text-deep font-sans text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-sans text-xs text-muted mb-1">方案名稱 *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例：個人諮商（50分鐘）"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block font-sans text-xs text-muted mb-1">說明（選填）</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="方案說明"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-sans text-xs text-muted mb-1">每次收費 *</label>
                  <input
                    type="number"
                    min={0}
                    value={form.price_per_session}
                    onChange={(e) => setForm((f) => ({ ...f, price_per_session: e.target.value }))}
                    placeholder="600"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-sans text-xs text-muted mb-1">貨幣</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="MOP">MOP</option>
                    <option value="HKD">HKD</option>
                    <option value="TWD">TWD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-sans text-xs text-muted mb-1">總次數</label>
                  <input
                    type="number"
                    min={1}
                    value={form.session_count}
                    onChange={(e) => setForm((f) => ({ ...f, session_count: e.target.value }))}
                    placeholder="不限"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-sans text-xs text-muted mb-1">最小年齡</label>
                  <input
                    type="number"
                    min={0}
                    value={form.age_min}
                    onChange={(e) => setForm((f) => ({ ...f, age_min: e.target.value }))}
                    placeholder="無"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block font-sans text-xs text-muted mb-1">最大年齡</label>
                  <input
                    type="number"
                    min={0}
                    value={form.age_max}
                    onChange={(e) => setForm((f) => ({ ...f, age_max: e.target.value }))}
                    placeholder="無"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block font-sans text-xs text-muted mb-1">排列順序</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>

            {err && <p className="font-sans text-xs text-red-500">{err}</p>}

            <div className="flex gap-2 pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 font-sans text-xs py-2 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors"
              >
                {saving ? "儲存中…" : modal.mode === "add" ? "新增" : "儲存"}
              </button>
              <button
                onClick={() => setModal({ mode: "closed" })}
                className="flex-1 font-sans text-xs py-2 border border-sand/30 text-muted hover:text-deep transition-colors"
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
