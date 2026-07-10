"use client";

import { useState, useEffect, useCallback } from "react";

type Room = {
  id: string;
  name: string;
  color: string;
  capacity: number;
  sort_order: number;
  is_active: boolean;
};

type FormData = { name: string; color: string; capacity: number; sort_order: number };

type Modal =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; room: Room };

const DEFAULT_COLOR = "#8B9E83";

export default function RoomsClient() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [modal, setModal] = useState<Modal>({ mode: "closed" });
  const [form, setForm] = useState<FormData>({ name: "", color: DEFAULT_COLOR, capacity: 2, sort_order: 0 });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/rooms");
    if (res.ok) setRooms(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm({ name: "", color: DEFAULT_COLOR, capacity: 2, sort_order: rooms.length + 1 });
    setModal({ mode: "add" });
    setErr("");
  }

  function openEdit(room: Room) {
    setForm({ name: room.name, color: room.color, capacity: room.capacity, sort_order: room.sort_order });
    setModal({ mode: "edit", room });
    setErr("");
  }

  async function save() {
    if (!form.name.trim()) { setErr("請填寫空間名稱"); return; }
    setSaving(true);
    setErr("");
    try {
      const isEdit = modal.mode === "edit";
      const url = isEdit ? `/api/admin/rooms/${modal.room.id}` : "/api/admin/rooms";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? "發生錯誤"); return; }
      await load();
      setModal({ mode: "closed" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(room: Room) {
    await fetch(`/api/admin/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !room.is_active }),
    });
    await load();
  }

  async function del(room: Room) {
    if (!confirm(`確定要刪除「${room.name}」？此操作無法復原。`)) return;
    const res = await fetch(`/api/admin/rooms/${room.id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  const isOpen = modal.mode !== "closed";

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-deep text-2xl">諮商空間管理</h1>
          <p className="font-sans text-xs text-muted mt-0.5">管理諮商室名稱、顏色與容量，供排案時選用。</p>
        </div>
        <button
          onClick={openAdd}
          className="font-sans text-xs bg-deep text-paper px-4 py-2 hover:bg-forest transition-colors flex-shrink-0"
        >
          + 新增空間
        </button>
      </div>

      <div className="space-y-2">
        {rooms.map((room) => (
          <div
            key={room.id}
            className={`flex items-center gap-4 p-4 bg-white border transition-all ${
              room.is_active ? "border-sand/20" : "border-sand/10 opacity-50"
            }`}
          >
            <div
              className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-black/10"
              style={{ backgroundColor: room.color }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-serif text-deep">{room.name}</p>
              <p className="font-sans text-[11px] text-muted/60">
                容量 {room.capacity} 人 · 排序 {room.sort_order}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => toggleActive(room)}
                className={`font-sans text-[10px] px-2 py-1 transition-colors ${
                  room.is_active
                    ? "bg-forest/10 text-forest hover:bg-sand/20 hover:text-muted"
                    : "bg-sand/20 text-muted/60 hover:bg-forest/10 hover:text-forest"
                }`}
              >
                {room.is_active ? "啟用中" : "已停用"}
              </button>
              <button
                onClick={() => openEdit(room)}
                className="font-sans text-[10px] px-3 py-1 bg-sand/10 text-muted hover:bg-sand/20 transition-colors"
              >
                編輯
              </button>
              <button
                onClick={() => del(room)}
                className="font-sans text-[10px] px-3 py-1 text-red-400 hover:bg-red-50 transition-colors"
              >
                刪除
              </button>
            </div>
          </div>
        ))}
        {rooms.length === 0 && (
          <div className="text-center py-16 font-sans text-xs text-muted/40">
            尚未建立任何諮商空間。
          </div>
        )}
      </div>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"
          onClick={() => setModal({ mode: "closed" })}
        >
          <div
            className="bg-white p-6 w-full max-w-sm space-y-4 shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-deep text-lg">
              {modal.mode === "add" ? "新增空間" : `編輯：${modal.mode === "edit" ? modal.room.name : ""}`}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">名稱 *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50"
                  placeholder="例：A 室"
                  autoFocus
                />
              </div>

              <div>
                <label className="font-sans text-[11px] text-muted block mb-1">代表色</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="w-10 h-10 cursor-pointer border border-sand/20 p-0.5"
                  />
                  <span className="font-sans text-xs text-muted font-mono">{form.color}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-sans text-[11px] text-muted block mb-1">容量（人）</label>
                  <input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => setForm((f) => ({ ...f, capacity: +e.target.value }))}
                    className="w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50"
                  />
                </div>
                <div>
                  <label className="font-sans text-[11px] text-muted block mb-1">排序</label>
                  <input
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: +e.target.value }))}
                    className="w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50"
                  />
                </div>
              </div>
            </div>

            {err && <p className="font-sans text-xs text-red-500">{err}</p>}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setModal({ mode: "closed" })}
                className="flex-1 font-sans text-xs py-2 border border-sand/30 text-muted hover:bg-sand/10 transition-colors"
              >
                取消
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 font-sans text-xs py-2 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors"
              >
                {saving ? "儲存中…" : "儲存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
