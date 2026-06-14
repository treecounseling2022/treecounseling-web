"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AvailableAppointment = {
  id: string;
  scheduled_at: string | null;
  clientName: string;
};

type Props =
  | {
      therapistId: string;
      availableAppointments: AvailableAppointment[];
      noteId?: undefined;
      initialContent?: undefined;
      initialSubmitted?: undefined;
      appointmentLabel?: undefined;
    }
  | {
      therapistId: string;
      noteId: string;
      initialContent: string;
      initialSubmitted: boolean;
      appointmentLabel: string;
      availableAppointments?: undefined;
    };

export default function SessionNoteEditor(props: Props) {
  const router = useRouter();
  const isEdit = !!props.noteId;

  const [appointmentId, setAppointmentId] = useState("");
  const [content, setContent] = useState(isEdit ? props.initialContent : "");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  async function save(submit = false) {
    if (isEdit && props.initialSubmitted) return;
    if (!isEdit && !appointmentId) { setErr("請選擇對應的預約"); return; }
    if (!content.trim()) { setErr("請填寫晤談紀錄內容"); return; }

    if (submit) setSubmitting(true);
    else setSaving(true);
    setErr("");
    setSavedMsg("");

    try {
      let res: Response;
      if (isEdit) {
        res = await fetch(`/api/admin/sessions/${props.noteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, is_submitted: submit, submitted_at: submit ? new Date().toISOString() : undefined }),
        });
      } else {
        res = await fetch("/api/admin/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            therapist_id: props.therapistId,
            appointment_id: appointmentId,
            content,
            is_submitted: submit,
            submitted_at: submit ? new Date().toISOString() : undefined,
          }),
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

  return (
    <div className="space-y-5">
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
        <div className="bg-sand/10 px-3 py-2">
          <p className="font-sans text-xs text-muted">{props.appointmentLabel}</p>
        </div>
      )}

      {/* Submitted notice */}
      {isEdit && props.initialSubmitted && (
        <div className="bg-green-50 border border-green-100 px-4 py-3">
          <p className="font-sans text-xs text-green-700">
            此紀錄已提交，無法再修改。
          </p>
        </div>
      )}

      {/* Note content */}
      <div>
        <label className="font-sans text-[11px] text-muted block mb-1">
          晤談紀錄 *
          {isEdit && props.initialSubmitted && <span className="ml-2 text-muted/40">（唯讀）</span>}
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          readOnly={isEdit && props.initialSubmitted}
          rows={16}
          className={inputCls + " resize-none font-sans leading-relaxed" + (isEdit && props.initialSubmitted ? " bg-sand/5 text-muted" : "")}
          placeholder="記錄此次晤談的重要內容…（此內容行政可見，請勿填寫過於私密的資訊）"
        />
      </div>

      {err && <p className="font-sans text-xs text-red-500">{err}</p>}
      {savedMsg && <p className="font-sans text-xs text-forest">{savedMsg}</p>}

      {/* Actions */}
      {!(isEdit && props.initialSubmitted) && (
        <div className="flex items-center gap-3 pt-2">
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

      {isEdit && props.initialSubmitted && (
        <a href="/admin/sessions" className="font-sans text-xs text-forest hover:underline">
          ← 返回列表
        </a>
      )}
    </div>
  );
}
