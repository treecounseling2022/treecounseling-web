"use client";

import { useState, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type PresentingConcern = { category: string; items: string[] };

type ParsedClient = {
  full_name: string;
  gender: string;
  dob: string;
  city: string;
  email: string;
  phone: string;
  native_language: string;
  preferred_meeting_type: string;
  service_type: string;
  has_psychiatry_history: boolean | null;
  psychiatry_notes: string;
  has_prior_counseling: boolean | null;
  prior_counseling_notes: string;
  intake_notes: string;
  preferred_times: string;
  presenting_concerns: PresentingConcern[];
  relationship_duration: string;
  children_info: string;
  admin_notes: string;
};

type ImportResult = { name: string; ok: boolean; error?: string };

// ── CSV Parser (RFC 4180) ─────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        row.push(field);
        field = "";
        i++;
      } else if (ch === "\r" && text[i + 1] === "\n") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i += 2;
      } else if (ch === "\n") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// ── Format detection ──────────────────────────────────────────────────────────

function detectFormat(headers: string[]): "A" | "B" | "unknown" {
  if (headers.includes("手機號碼")) return "A";
  if (headers.includes("期待哪一位輔導人員？")) return "B";
  return "unknown";
}

// ── Column map: name → all indices (handles duplicate header names) ───────────

function buildColMap(headers: string[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  headers.forEach((h, i) => {
    const key = h.trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(i);
  });
  return map;
}

function col(row: string[], colMap: Map<string, number[]>, name: string, occurrence = 0): string {
  const indices = colMap.get(name);
  if (!indices || indices[occurrence] === undefined) return "";
  return (row[indices[occurrence]] ?? "").trim();
}

// ── Field mappers ─────────────────────────────────────────────────────────────

function parseJotDate(val: string): string {
  if (!val) return "";
  // "X月 D, YYYY" format
  const m = val.match(/^(\d{1,2})月\s+(\d{1,2}),\s*(\d{4})$/);
  if (!m) return val;
  const month = m[1].padStart(2, "0");
  const day = m[2].padStart(2, "0");
  const year = m[3];
  return `${year}-${month}-${day}`;
}

function mapGender(val: string): string {
  if (val === "男") return "male";
  if (val === "女") return "female";
  if (val === "其他") return "other";
  return "";
}

function mapLang(val: string): string {
  if (val.includes("粵")) return "cantonese";
  if (val.includes("普通") || val.includes("國語")) return "mandarin";
  if (val.toLowerCase().includes("english") || val.includes("英")) return "english";
  if (val) return "other";
  return "";
}

function mapMeeting(val: string): string {
  if (val.includes("面談") || val.includes("面對面")) return "face";
  if (val.includes("線上") || val.toLowerCase().includes("online")) return "online";
  return "";
}

function mapService(val: string): string {
  if (val.includes("伴侶")) return "couple";
  if (val.includes("個人") || val.includes("輔導")) return "individual";
  return "individual";
}

function mapBool(val: string): boolean | null {
  if (val === "有") return true;
  if (val === "沒有" || val === "無") return false;
  return null;
}

// ── Time slot parser ──────────────────────────────────────────────────────────

const DAY_ORDER_IMPORT = ["一", "二", "三", "四", "五", "六", "日", "七"];
const DAY_NORM: Record<string, string> = { 七: "日" };

function parseTimeSlots(row: string[], headers: string[]): string {
  // Format A uses 七 for Sunday; Format B uses 日
  const slots: Array<{ day: string; time: string }> = [];

  headers.forEach((h, i) => {
    if (!h.startsWith("No Label >> ")) return;
    const val = (row[i] ?? "").trim();
    if (!val) return;

    // "No Label >> HH:MM-HH:MM >> DAY"
    const parts = h.split(" >> ");
    if (parts.length < 3) return;
    const time = parts[1].trim();
    const rawDay = parts[2].trim();
    const day = DAY_NORM[rawDay] ?? rawDay;
    slots.push({ day, time });
  });

  if (slots.length === 0) return "";

  // Sort by day then time
  slots.sort((a, b) => {
    const di = DAY_ORDER_IMPORT.indexOf(a.day) - DAY_ORDER_IMPORT.indexOf(b.day);
    if (di !== 0) return di;
    return a.time.localeCompare(b.time);
  });

  return slots.map((s) => `星期${s.day} ${s.time}`).join("、");
}

// ── Concern parsers ───────────────────────────────────────────────────────────

// Format B: "您的困擾類型" is a newline/comma-separated list of categories
function parseConcernsB(raw: string): PresentingConcern[] {
  if (!raw) return [];
  const categories = raw
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return categories.map((c) => ({ category: c, items: [] }));
}

// Format A: separate columns per category, cell value = sub-items text
const CONCERN_COLS_A: Array<{ col: string; category: string }> = [
  { col: "成癮問題", category: "成癮問題" },
  { col: "自我探索", category: "自我探索" },
  { col: "家庭關係", category: "家庭關係" },
  { col: "伴侶關係", category: "伴侶關係" },
  { col: "親子關係", category: "親子關係" },
  { col: "工作壓力", category: "工作壓力" },
  { col: "學業／生涯", category: "學業/生涯" },
  { col: "人際關係", category: "人際關係" },
  { col: "情緒困擾", category: "情緒困擾" },
];

function parseConcernsA(row: string[], colMap: Map<string, number[]>): PresentingConcern[] {
  const concerns: PresentingConcern[] = [];
  for (const { col: colName, category } of CONCERN_COLS_A) {
    const val = col(row, colMap, colName);
    if (!val) continue;
    const items = val
      .split(/[,，\n／]/)
      .map((s) => s.trim())
      .filter(Boolean);
    concerns.push({ category, items });
  }
  return concerns;
}

// ── Row parsers ───────────────────────────────────────────────────────────────

function parseRowB(row: string[], headers: string[], colMap: Map<string, number[]>): ParsedClient {
  // "請簡述狀況" appears twice: first after 曾有精神科就診, second after 曾有接受心理輔導
  const psychiatryNotes = col(row, colMap, "請簡述狀況", 0);
  const counselingNotes = col(row, colMap, "請簡述狀況", 1);

  const whatsappId = col(row, colMap, "聯絡帳號/ID");
  const contactMethod = col(row, colMap, "聯絡方式：");

  return {
    full_name: col(row, colMap, "姓名"),
    gender: mapGender(col(row, colMap, "性別")),
    dob: parseJotDate(col(row, colMap, "出生日期")),
    city: col(row, colMap, "居住城市"),
    email: col(row, colMap, "Email"),
    phone: "",
    native_language: mapLang(col(row, colMap, "母語")),
    preferred_meeting_type: mapMeeting(col(row, colMap, "期待晤談方式")),
    service_type: mapService(col(row, colMap, "需要的服務")),
    has_psychiatry_history: mapBool(col(row, colMap, "曾有精神科就診經驗")),
    psychiatry_notes: psychiatryNotes,
    has_prior_counseling: mapBool(col(row, colMap, "曾有接受心理輔導或諮商經驗")),
    prior_counseling_notes: counselingNotes,
    intake_notes: col(row, colMap, "請簡述你目前遇到的困擾"),
    preferred_times: parseTimeSlots(row, headers),
    presenting_concerns: parseConcernsB(col(row, colMap, "您的困擾類型")),
    relationship_duration: "",
    children_info: "",
    admin_notes: [contactMethod, whatsappId].filter(Boolean).join(": "),
  };
}

function parseRowA(row: string[], headers: string[], colMap: Map<string, number[]>): ParsedClient {
  const serviceRaw = col(row, colMap, "需要的服務");
  const isCouple = serviceRaw.includes("伴侶");

  // "請簡述狀況" can appear in both couple and individual sections
  // In Format A: first occurrence is after 曾有接受心理輔導（individual）
  // and second is after 曾有精神科就診（after time slots block）
  // Indices depend on header order; use occurrence 0 and 1
  const counselingNotesRaw = col(row, colMap, "請簡述狀況", 0);
  const psychiatryNotesRaw = col(row, colMap, "請簡述狀況", 1);

  const phone = col(row, colMap, "手機號碼");
  const whatsappId = col(row, colMap, "聯絡帳號/ID");

  // For couple rows the couple-specific fields are filled
  const relationshipDuration = col(row, colMap, "開始伴侶關係多久？");
  const childrenInfo = col(row, colMap, "育有多少名子女（可以的話，把性別也列出）");

  // intake notes: couple uses 請說明你們目前遇到的狀況, individual uses 請基於上面勾選的內容簡述你目前遇到的困擾
  const coupleNotes = col(row, colMap, "請說明你們目前遇到的狀況");
  const individualNotes = col(row, colMap, "請基於上面勾選的內容簡述你目前遇到的困擾");
  const intakeNotes = isCouple ? coupleNotes : individualNotes;

  // Email: for couple use 「A」先生/小姐 電子郵件, for individual use Email
  const emailCouple = col(row, colMap, "「A」先生/小姐 電子郵件");
  const emailIndividual = col(row, colMap, "Email");
  const email = isCouple ? (emailCouple || emailIndividual) : emailIndividual;

  // Preferred meeting
  const meetingCouple = col(row, colMap, "期待的晤談方式");
  const meetingIndividual = col(row, colMap, "期待晤談方式");
  const meeting = mapMeeting(isCouple ? meetingCouple : meetingIndividual);

  // For couple, preferred times is a text field (not checkbox grid)
  let preferredTimes: string;
  if (isCouple) {
    const rawCoupleTime = col(row, colMap, "方便晤談的時間（暫時只有這些時段可進行伴侶輔導）");
    preferredTimes = rawCoupleTime;
  } else {
    preferredTimes = parseTimeSlots(row, headers);
  }

  const concerns = isCouple
    ? [{ category: "伴侶輔導", items: (col(row, colMap, "遇到的狀況") || "").split(/\n/).map((s) => s.trim()).filter(Boolean) }]
    : parseConcernsA(row, colMap);

  const therapistPref = col(row, colMap, "更傾向哪一位輔導人員？");
  const requirements = col(row, colMap, "對於輔導人員的要求");
  const adminNotesParts: string[] = [];
  if (phone) adminNotesParts.push(`WhatsApp: ${phone}`);
  if (whatsappId) adminNotesParts.push(`ID: ${whatsappId}`);
  if (therapistPref && therapistPref !== "由我們安排") adminNotesParts.push(`偏好輔導師: ${therapistPref}`);
  if (requirements) adminNotesParts.push(`輔導師要求: ${requirements}`);

  return {
    full_name: col(row, colMap, "姓名"),
    gender: mapGender(col(row, colMap, "性別")),
    dob: parseJotDate(col(row, colMap, "出生日期")),
    city: col(row, colMap, "居住城市"),
    email,
    phone,
    native_language: mapLang(col(row, colMap, "母語")),
    preferred_meeting_type: meeting,
    service_type: mapService(serviceRaw),
    has_psychiatry_history: isCouple ? null : mapBool(col(row, colMap, "曾有精神科就診經驗")),
    psychiatry_notes: isCouple ? "" : psychiatryNotesRaw,
    has_prior_counseling: isCouple ? null : mapBool(col(row, colMap, "曾有接受心理輔導或諮商經驗")),
    prior_counseling_notes: isCouple ? "" : counselingNotesRaw,
    intake_notes: intakeNotes,
    preferred_times: preferredTimes,
    presenting_concerns: concerns,
    relationship_duration: relationshipDuration,
    children_info: childrenInfo,
    admin_notes: adminNotesParts.join(" | "),
  };
}

// ── Main parse function ───────────────────────────────────────────────────────

function parseFile(text: string): { format: string; clients: ParsedClient[]; error?: string } {
  const rows = parseCSV(text);
  if (rows.length < 2) return { format: "unknown", clients: [], error: "CSV 內容不足（至少需要標題列與一筆資料）" };

  const headers = rows[0].map((h) => h.trim());
  const format = detectFormat(headers);
  if (format === "unknown") return { format: "unknown", clients: [], error: "無法辨識 CSV 格式，請確認此為 JotForm 匯出的預約表" };

  const colMap = buildColMap(headers);
  const clients: ParsedClient[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((c) => !c.trim())) continue; // skip blank rows

    const flowStatus = col(row, colMap, "Flow Status");
    if (flowStatus && flowStatus !== "COMPLETED") continue; // skip incomplete submissions

    try {
      const parsed = format === "A"
        ? parseRowA(row, headers, colMap)
        : parseRowB(row, headers, colMap);

      if (parsed.full_name) clients.push(parsed);
    } catch {
      // skip unparseable rows
    }
  }

  return { format, clients };
}

// ── Component ─────────────────────────────────────────────────────────────────

type Step = "upload" | "preview" | "results";

export default function ImportClient() {
  const [step, setStep] = useState<Step>("upload");
  const [format, setFormat] = useState("");
  const [clients, setClients] = useState<ParsedClient[]>([]);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { format: fmt, clients: parsed, error } = parseFile(text);
      if (error) {
        setParseError(error);
        setStep("upload");
        return;
      }
      setParseError("");
      setFormat(fmt);
      setClients(parsed);
      setStep("preview");
    };
    reader.readAsText(file, "utf-8");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: clients }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
      setStep("results");
    } catch {
      setResults([{ name: "（系統錯誤）", ok: false, error: "無法連接伺服器" }]);
      setStep("results");
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setStep("upload");
    setClients([]);
    setResults([]);
    setParseError("");
    setFormat("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return (
    <div className="space-y-6">
      {/* Step 1: Upload */}
      {step === "upload" && (
        <div
          className="border-2 border-dashed border-sand/30 rounded p-10 text-center cursor-pointer hover:border-forest/40 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <div className="space-y-2">
            <svg className="mx-auto w-10 h-10 text-muted/30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="font-sans text-sm text-muted">點擊或拖放 JotForm CSV 檔案至此</p>
            <p className="font-sans text-xs text-muted/50">支援格式：心理專業服務預約表（Format A / Format B）</p>
          </div>
        </div>
      )}

      {parseError && (
        <div className="bg-red-50 border border-red-200 px-4 py-3 font-sans text-sm text-red-700">
          {parseError}
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-sans text-sm text-deep">
                解析完成：共 <span className="font-medium">{clients.length}</span> 筆個案
                <span className="ml-2 text-muted/60 text-xs">（格式 {format}）</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="font-sans text-xs px-4 py-2 border border-sand/30 text-muted hover:text-deep transition-colors">
                重新選擇
              </button>
              <button
                onClick={handleImport}
                disabled={importing || clients.length === 0}
                className="font-sans text-xs px-4 py-2 bg-forest text-paper hover:bg-deep disabled:opacity-50 transition-colors"
              >
                {importing ? "匯入中…" : `確認匯入 ${clients.length} 筆`}
              </button>
            </div>
          </div>

          <div className="border border-sand/20 divide-y divide-sand/10">
            {clients.map((c, i) => (
              <div key={i} className="text-sm font-sans">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-soft/50 text-left transition-colors"
                  onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted/40 text-xs w-6">{i + 1}</span>
                    <span className="text-deep font-medium">{c.full_name || "（無姓名）"}</span>
                    <span className="text-muted/60 text-xs">{c.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted/50 bg-sand/10 px-2 py-0.5 rounded">
                      {c.service_type === "couple" ? "伴侶" : "個人"}
                    </span>
                    <span className="text-muted/40 text-xs">{expandedIdx === i ? "▲" : "▼"}</span>
                  </div>
                </button>

                {expandedIdx === i && (
                  <div className="px-4 pb-4 bg-soft/30 space-y-2 text-xs text-muted">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 pt-2">
                      <Field label="性別" value={{ male: "男", female: "女", other: "其他" }[c.gender] ?? c.gender} />
                      <Field label="出生日期" value={c.dob} />
                      <Field label="城市" value={c.city} />
                      <Field label="電話" value={c.phone} />
                      <Field label="母語" value={{ cantonese: "粵語", mandarin: "普通話", english: "英語", other: "其他" }[c.native_language] ?? c.native_language} />
                      <Field label="晤談方式" value={{ face: "面談", online: "線上" }[c.preferred_meeting_type] ?? c.preferred_meeting_type} />
                      <Field label="精神科經驗" value={c.has_psychiatry_history === true ? "有" : c.has_psychiatry_history === false ? "沒有" : "—"} />
                      <Field label="諮商經驗" value={c.has_prior_counseling === true ? "有" : c.has_prior_counseling === false ? "沒有" : "—"} />
                      {c.relationship_duration && <Field label="關係時長" value={c.relationship_duration} />}
                      {c.children_info && <Field label="子女" value={c.children_info} />}
                    </div>
                    {c.preferred_times && (
                      <div><span className="text-muted/50">可行時段：</span>{c.preferred_times}</div>
                    )}
                    {c.presenting_concerns.length > 0 && (
                      <div><span className="text-muted/50">困擾類型：</span>{c.presenting_concerns.map((p) => p.category).join("、")}</div>
                    )}
                    {c.intake_notes && (
                      <div className="bg-white border border-sand/20 p-2 whitespace-pre-wrap leading-relaxed">
                        <span className="text-muted/50">求助說明：</span>{c.intake_notes}
                      </div>
                    )}
                    {c.admin_notes && (
                      <div><span className="text-muted/50">備註：</span>{c.admin_notes}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === "results" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-sans text-sm">
              <span className="text-forest font-medium">{succeeded} 筆成功</span>
              {failed > 0 && <span className="text-red-600 font-medium ml-3">{failed} 筆失敗</span>}
            </div>
            <button onClick={reset} className="font-sans text-xs px-4 py-2 border border-sand/30 text-muted hover:text-deep transition-colors">
              匯入新檔案
            </button>
          </div>

          <div className="border border-sand/20 divide-y divide-sand/10">
            {results.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 font-sans text-sm">
                <span className={r.ok ? "text-deep" : "text-red-600"}>{r.name}</span>
                {r.ok
                  ? <span className="text-forest text-xs">✓ 已建立</span>
                  : <span className="text-red-500 text-xs">{r.error ?? "失敗"}</span>
                }
              </div>
            ))}
          </div>

          {succeeded > 0 && (
            <p className="font-sans text-xs text-muted/60">
              請至「個案管理」人工校對匯入的資料，並為每位個案補充晤談記錄。
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-1">
      <span className="text-muted/50 shrink-0">{label}：</span>
      <span className="text-deep">{value}</span>
    </div>
  );
}
