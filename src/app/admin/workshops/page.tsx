"use client";

import { useState, useEffect, useCallback } from "react";

type Workshop = {
  id: string;
  therapist_id: string;
  title: string;
  scheduled_at: string;
  duration_hours: number;
  hourly_rate: number;
  total_fee: number;
  currency: string;
  status: "scheduled" | "completed" | "cancelled";
  notes: string | null;
};

type Therapist = { id: string; name: string };

type FormData = {
  therapist_id: string;
  title: string;
  scheduled_at: string;
  duration_hours: string;
  hourly_rate: string;
  total_fee: string;
  notes: string;
};

type Modal =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; workshop: Workshop };

const STATUS_LABEL: Record<string, string> = {
  scheduled: "待辦",
  completed: "已完成",
  cancelled: "已取消",
};

const STATUS_CLS: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-sand/20 text-muted",
};

function emptyForm(therapists: Therapist[]): FormData {
  return {
    therapist_id: therapists[0]?.id ?? "",
    title: "",
    scheduled_at: "",
    duration_hours: "1",
    hourly_rate: "",
    total_fee: "",
    notes: "",
  };
}

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [therapistMap, setTherapistMap] = useState<Record<string, string>>({});
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [modal, setModal] = useState<Modal>({ mode: "closed" });
  const [form, setForm] = useState<FormData>(emptyForm([]));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const [wRes, tRes] = await Promise.all([
      fetch("/api/admin/workshops"),
      fetch("/api/admin/therapists"),
    ]);
    if (wRes.ok) {
      const { workshops: ws, therapistMap: tm } = await wRes.json();
      setWorkshops(ws);
      setTherapistMap(tm);
    }
    if (tRes.ok) setTherapists(await tRes.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  function computedTotal(f: FormData): number {
    const h = parseFloat(f.duration_hours) || 0;
    const r = parseFloat(f.hourly_rate) || 0;
    return Math.round(h * r * 100) / 100;
  }

  function openAdd() {
    const f = emptyForm(therapists);
    setForm(f);
    setModal({ mode: "add" });
    setErr("");
  }

  function openEdit(w: Workshop) {
    setForm({
      therapist_id: w.therapist_id,
      title: w.title,
      scheduled_at: w.scheduled_at.slice(0, 16),
      duration_hours: String(w.duration_hours),
      hourly_rate: String(w.hourly_rate),
      total_fee: String(w.total_fee),
      notes: w.notes ?? "",
    });
    setModal({ mode: "edit", workshop: w });
    setErr("");
  }

  function handleHourlyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = { ...form, hourly_rate: e.target.value };
    setForm({ ...next, total_fee: String(computedTotal(next)) });
  }

  function handleDurationChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = { ...form, duration_hours: e.target.value };
    setForm({ ...next, total_fee: String(computedTotal(next)) });
  }

  async function save() {
    if (!form.therapist_id) { setErr("請選擇心理師"); return; }
    if (!form.title.trim()) { setErr("請填寫活動名稱"); return; }
    if (!form.scheduled_at) { setErr("請選擇日期時間"); return; }
    const totalFee = parseFloat(form.total_fee) || computedTotal(form);
    if (totalFee <= 0) { setErr("總費用必須大於 0"); return; }

    setSaving(true);
    setErr("");
    try {
      const payload = {
        therapist_id: form.therapist_id,
        title: form.title.trim(),
        scheduled_at: form.scheduled_at,
        duration_hours: parseFloat(form.duration_hours) || 1,
        hourly_rate: parseFloat(form.hourly_rate) || 0,
        total_fee: totalFee,
        notes: form.notes || null,
      };
      const isEdit = modal.mode === "edit";
      const url = isEdit ? `/api/admin/workshops/${modal.workshop.id}` : "/api/admin/workshops";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/admin/workshops/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("確定要刪除此活動？")) return;
    const res = await fetch(`/api/admin/workshops/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json();
      alert(j.error ?? "刪除失敗");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-sans text-xs text-muted mb-1">
            <a href="/admin" className="hover:text-forest">後台</a> / 講座 / 工作坊
          </p>
          <h1 className="font-serif text-deep text-2xl">講座 / 工作坊</h1>
          <p className="font-sans text-xs text-muted mt-0.5">
            記錄每場活動的時薪、時數與總費用，薪酬頁面自動計算心理師分成。
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-deep text-paper font-sans text-xs hover:bg-forest transition-colors cursor-pointer flex-shrink-0"
        >
          + 新增活動
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-sand/20 overflow-hidden">
        {workshops.length === 0 ? (
          <div className="py-16 text-center font-sans text-xs text-muted/40">
            尚未建立任何講座 / 工作坊記錄。
          </div>
        ) : (
          <table className="w-full font-sans text-xs">
            <thead>
              <tr className="border-b border-sand/20 bg-sand/5">
                <th className="text-left text-muted px-4 py-3 font-normal">日期</th>
                <th className="text-left text-muted px-4 py-3 font-normal">活動名稱</th>
                <th className="text-left text-muted px-4 py-3 font-normal">心理師</th>
                <th className="text-right text-muted px-4 py-3 font-normal">時數</th>
                <th className="text-right text-muted px-4 py-3 font-normal">時薪</th>
                <th className="text-right text-muted px-4 py-3 font-normal">總費用</th>
                <th className="text-center text-muted px-4 py-3 font-normal">狀態</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {workshops.map((w) => (
                <tr key={w.id} className="border-b border-sand/10 last:border-0 hover:bg-sand/5 transition-colors">
                  <td className="px-4 py-3 text-muted">
                    {new Date(w.scheduled_at).toLocaleDateString("zh-TW", {
                      year: "numeric", month: "2-digit", day: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-deep font-medium">{w.title}</td>
                  <td className="px-4 py-3 text-muted">
                    {therapistMap[w.therapist_id] ?? w.therapist_id}
                  </td>
                  <td className="px-4 py-3 text-right text-muted">{w.duration_hours}h</td>
                  <td className="px-4 py-3 text-right text-muted">
                    {w.hourly_rate > 0 ? `${w.hourly_rate.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-deep font-medium">
                    MOP {w.total_fee.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-[10px] ${STATUS_CLS[w.status]}`}>
                      {STATUS_LABEL[w.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      {w.status === "scheduled" && (
                        <>
                          <button
                            onClick={() => updateStatus(w.id, "completed")}
                            className="text-green-600 hover:text-green-800 transition-colors cursor-pointer"
                          >
                            完成
                          </button>
                          <button
                            onClick={() => openEdit(w)}
                            className="text-muted hover:text-deep transition-colors cursor-pointer"
                          >
                            編輯
                          </button>
                          <button
                            onClick={() => remove(w.id)}
                            className="text-sand/60 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            刪除
                          </button>
                        </>
                      )}
                      {w.status === "completed" && (
                        <button
                          onClick={() => openEdit(w)}
                          className="text-muted hover:text-deep transition-colors cursor-pointer"
                        >
                          查看
                        </button>
                      )}
                      {w.status === "cancelled" && (
                        <button
                          onClick={() => remove(w.id)}
                          className="text-sand/60 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          刪除
                        </button>
                      )}
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
          <div className="bg-white w-full max-w-lg space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-deep text-lg">
                {modal.mode === "add" ? "新增活動" : "編輯活動"}
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
                <label className="block font-sans text-xs text-muted mb-1">心理師</label>
                <select
                  value={form.therapist_id}
                  onChange={(e) => setForm((f) => ({ ...f, therapist_id: e.target.value }))}
                  className={inputCls}
                  disabled={modal.mode === "edit" && modal.workshop.status === "completed"}
                >
                  {therapists.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-sans text-xs text-muted mb-1">活動名稱</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="例：青年心理健康講座"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block font-sans text-xs text-muted mb-1">日期與時間</label>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-sans text-xs text-muted mb-1">時數</label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={form.duration_hours}
                    onChange={handleDurationChange}
                    className={inputCls}
                    placeholder="2"
                  />
                </div>
                <div>
                  <label className="block font-sans text-xs text-muted mb-1">時薪（MOP）</label>
                  <input
                    type="number"
                    min={0}
                    value={form.hourly_rate}
                    onChange={handleHourlyChange}
                    className={inputCls}
                    placeholder="500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-sans text-xs text-muted mb-1">
                  總費用（MOP）
                  <span className="text-muted/50 ml-1">（時數 × 時薪自動填入，可手動調整）</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.total_fee}
                  onChange={(e) => setForm((f) => ({ ...f, total_fee: e.target.value }))}
                  className={inputCls}
                  placeholder="1000"
                />
              </div>

              <div>
                <label className="block font-sans text-xs text-muted mb-1">備註（選填）</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className={inputCls}
                  placeholder="例：澳門大學合辦"
                />
              </div>
            </div>

            {err && (
              <p className="font-sans text-xs text-red-500">{err}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="px-5 py-2 bg-deep text-paper font-sans text-xs hover:bg-forest transition-colors disabled:opacity-40 cursor-pointer"
              >
                {saving ? "儲存中…" : modal.mode === "add" ? "新增" : "儲存"}
              </button>
              <button
                onClick={() => setModal({ mode: "closed" })}
                className="px-5 py-2 border border-sand/30 font-sans text-xs text-muted hover:text-deep hover:border-deep/30 transition-colors cursor-pointer"
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

const inputCls = "border border-sand/25 bg-soft/30 px-3 py-2 font-sans text-xs text-deep focus:outline-none focus:border-forest transition-colors w-full";
