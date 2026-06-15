"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AvailableAppointment = {
  id: string;
  scheduled_at: string | null;
  sessionType: string;
  clientName: string;
};

type NoteFields = {
  session_topic: string;
  content: string;
  observations: string;
  assessment: string;
  plan: string;
  risk_level: string;
  risk_note: string;
};

type Props =
  | {
      therapistId: string;
      availableAppointments: AvailableAppointment[];
      defaultAppointmentId?: string;
      noteId?: undefined;
      initialFields?: undefined;
      initialIntakeBackground?: undefined;
      isIntake?: undefined;
      initialSubmitted?: undefined;
      appointmentLabel?: undefined;
    }
  | {
      therapistId: string;
      noteId: string;
      initialFields: NoteFields;
      initialIntakeBackground?: string;
      isIntake?: boolean;
      initialSubmitted: boolean;
      appointmentLabel: string;
      availableAppointments?: undefined;
      defaultAppointmentId?: undefined;
    };

const RISK_LABELS: Record<string, string> = {
  none: "無明顯風險",
  low: "低度風險",
  medium: "中度風險（需追蹤）",
  high: "高度風險（需立即處理）",
};

const RISK_COLORS: Record<string, string> = {
  none: "text-muted",
  low: "text-blue-600",
  medium: "text-amber-600",
  high: "text-red-600",
};

export default function SessionNoteEditor(props: Props) {
  const router = useRouter();
  const isEdit = !!props.noteId;
  const isReadOnly = isEdit && props.initialSubmitted;

  const initial: NoteFields = isEdit
    ? props.initialFields
    : {
        session_topic: "",
        content: "",
        observations: "",
        assessment: "",
        plan: "",
        risk_level: "none",
        risk_note: "",
      };

  const [appointmentId, setAppointmentId] = useState(props.defaultAppointmentId ?? "");
  const [fields, setFields] = useState<NoteFields>(initial);
  const [intakeBackground, setIntakeBackground] = useState(props.initialIntakeBackground ?? "");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  // Derive isIntake: for new notes, check selected appointment; for edit, use prop
  const selectedApptIsIntake = !isEdit
    ? (props.availableAppointments?.find((a) => a.id === appointmentId)?.sessionType === "intake") ?? false
    : (props.isIntake ?? false);
  const showIntakeFields = selectedApptIsIntake;

  function set(key: keyof NoteFields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function save(submit = false) {
    if (isReadOnly) return;
    if (!isEdit && !appointmentId) { setErr("請選擇對應的預約"); return; }
    if (!fields.content.trim()) { setErr("請填寫晤談摘要"); return; }

    if (submit) setSubmitting(true);
    else setSaving(true);
    setErr("");
    setSavedMsg("");

    try {
      const payload = {
        ...fields,
        ...(showIntakeFields ? { intake_background: intakeBackground } : {}),
        is_submitted: submit,
        submitted_at: submit ? new Date().toISOString() : undefined,
        ...(!isEdit ? { therapist_id: props.therapistId, appointment_id: appointmentId } : {}),
      };

      let res: Response;
      if (isEdit) {
        res = await fetch(`/api/admin/sessions/${props.noteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? "發生錯誤"); return; }

      if (submit) {
        router.push("/admin/sessions");
      } else if (!isEdit) {
        router.push(`/admin/sessions/${json.id}`);
      } else {
        setSavedMsg("草稿已儲存");
      }
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  }

  const inputCls = "w-full border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50";
  const readOnlyCls = " bg-sand/5 text-muted resize-none";

  return (
    <div className="space-y-6">
      {/* Appointment selector (new only) */}
      {!isEdit && props.availableAppointments && (
        <div>
          <label className="font-sans text-[11px] text-muted block mb-1">對應預約 *</label>
          {props.availableAppointments.length === 0 ? (
            <p className="font-sans text-xs text-muted/60 bg-sand/10 px-3 py-2">
              目前沒有可填寫的已確認預約。
            </p>
          ) : (
            <select
              value={appointmentId}
              onChange={(e) => setAppointmentId(e.target.value)}
              className={inputCls}
            >
              <option value="">請選擇預約…</option>
              {props.availableAppointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.sessionType === "intake" ? "【首次初談】" : ""}
                  {a.clientName}
                  {a.scheduled_at
                    ? ` — ${new Date(a.scheduled_at).toLocaleDateString("zh-TW")}`
                    : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Appointment label (edit only) */}
      {isEdit && props.appointmentLabel && (
        <div className="bg-sand/10 px-3 py-2 flex items-center gap-2">
          <p className="font-sans text-xs text-muted">{props.appointmentLabel}</p>
        </div>
      )}

      {/* Intake notice */}
      {showIntakeFields && (
        <div className="bg-blue-50 border border-blue-100 px-4 py-2">
          <p className="font-sans text-xs text-blue-700 font-medium">首次初談紀錄</p>
          <p className="font-sans text-[11px] text-blue-600/70 mt-0.5">此為個案首次晤談，請填寫初談專用欄位。</p>
        </div>
      )}

      {/* Submitted notice */}
      {isReadOnly && (
        <div className="bg-green-50 border border-green-100 px-4 py-3">
          <p className="font-sans text-xs text-green-700">此紀錄已提交，無法再修改。</p>
        </div>
      )}

      {/* ── Intake only: 個案背景 ── */}
      {showIntakeFields && (
        <div>
          <label className="font-sans text-[11px] text-muted block mb-1">個案背景</label>
          <textarea
            value={intakeBackground}
            onChange={(e) => setIntakeBackground(e.target.value)}
            readOnly={isReadOnly}
            rows={4}
            placeholder="家庭背景、成長經歷、重要生命事件、過往諮商經驗…"
            className={inputCls + " resize-none leading-relaxed" + (isReadOnly ? readOnlyCls : "")}
          />
        </div>
      )}

      {/* ── Section 1: 本次議題 / 首次：主要求助問題 ── */}
      <div>
        <label className="font-sans text-[11px] text-muted block mb-1">
          {showIntakeFields ? "主要求助問題" : "本次呈現議題"}
        </label>
        <input
          type="text"
          value={fields.session_topic}
          onChange={(e) => set("session_topic", e.target.value)}
          readOnly={isReadOnly}
          placeholder={showIntakeFields ? "個案此次求助的主要問題或困擾" : "個案本次帶來的主要議題或關注"}
          className={inputCls + (isReadOnly ? " bg-sand/5 text-muted" : "")}
        />
      </div>

      {/* ── Section 2: 晤談摘要 / 首次：初談記錄 ── */}
      <div>
        <label className="font-sans text-[11px] text-muted block mb-1">
          {showIntakeFields ? "初談記錄 *" : "晤談摘要 *"}
          {isReadOnly && <span className="ml-2 text-muted/40">（唯讀）</span>}
        </label>
        <textarea
          value={fields.content}
          onChange={(e) => set("content", e.target.value)}
          readOnly={isReadOnly}
          rows={8}
          placeholder={showIntakeFields ? "記錄初談過程、個案呈現、晤談歷程…" : "記錄本次晤談的主要過程與討論內容…"}
          className={inputCls + " resize-none leading-relaxed" + (isReadOnly ? readOnlyCls : "")}
        />
      </div>

      {/* ── Section 3: 觀察紀錄 ── */}
      <div>
        <label className="font-sans text-[11px] text-muted block mb-1">觀察紀錄</label>
        <textarea
          value={fields.observations}
          onChange={(e) => set("observations", e.target.value)}
          readOnly={isReadOnly}
          rows={4}
          placeholder="個案的情緒狀態、行為表現、外表儀容、非語言訊息等…"
          className={inputCls + " resize-none leading-relaxed" + (isReadOnly ? readOnlyCls : "")}
        />
      </div>

      {/* ── Section 4: 評估 ── */}
      <div>
        <label className="font-sans text-[11px] text-muted block mb-1">評估</label>
        <textarea
          value={fields.assessment}
          onChange={(e) => set("assessment", e.target.value)}
          readOnly={isReadOnly}
          rows={4}
          placeholder="心理師的臨床評估、概念化、議題分析…"
          className={inputCls + " resize-none leading-relaxed" + (isReadOnly ? readOnlyCls : "")}
        />
      </div>

      {/* ── Section 5: 計畫 ── */}
      <div>
        <label className="font-sans text-[11px] text-muted block mb-1">計畫</label>
        <textarea
          value={fields.plan}
          onChange={(e) => set("plan", e.target.value)}
          readOnly={isReadOnly}
          rows={3}
          placeholder="下次晤談目標、家庭作業、轉介考量…"
          className={inputCls + " resize-none leading-relaxed" + (isReadOnly ? readOnlyCls : "")}
        />
      </div>

      {/* ── Section 6: 風險評估 ── */}
      <div className="space-y-2">
        <label className="font-sans text-[11px] text-muted block">風險評估</label>
        <select
          value={fields.risk_level}
          onChange={(e) => set("risk_level", e.target.value)}
          disabled={isReadOnly}
          className={inputCls + " " + (RISK_COLORS[fields.risk_level] ?? "") + (isReadOnly ? " bg-sand/5" : "")}
        >
          {Object.entries(RISK_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        {(fields.risk_level !== "none" || fields.risk_note) && (
          <textarea
            value={fields.risk_note}
            onChange={(e) => set("risk_note", e.target.value)}
            readOnly={isReadOnly}
            rows={3}
            placeholder="風險相關補充說明（行動、計畫、支持系統等）…"
            className={inputCls + " resize-none leading-relaxed" + (isReadOnly ? readOnlyCls : "")}
          />
        )}
      </div>

      {err && <p className="font-sans text-xs text-red-500">{err}</p>}
      {savedMsg && <p className="font-sans text-xs text-forest">{savedMsg}</p>}

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex items-center gap-3 pt-2 border-t border-sand/20">
          <button
            onClick={() => save(false)}
            disabled={saving || submitting}
            className="font-sans text-sm px-5 py-2 border border-sand/30 text-muted hover:bg-sand/10 disabled:opacity-40 transition-colors"
          >
            {saving ? "儲存中…" : "儲存草稿"}
          </button>
          <button
            onClick={() => {
              if (confirm("確定提交？提交後將無法修改。")) save(true);
            }}
            disabled={saving || submitting}
            className="font-sans text-sm px-5 py-2 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors"
          >
            {submitting ? "提交中…" : "提交紀錄"}
          </button>
          <a href="/admin/sessions" className="font-sans text-xs text-muted hover:text-deep transition-colors ml-auto">
            返回列表
          </a>
        </div>
      )}

      {isReadOnly && (
        <a href="/admin/sessions" className="font-sans text-xs text-forest hover:underline">
          ← 返回列表
        </a>
      )}
    </div>
  );
}
