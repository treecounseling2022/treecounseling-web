"use client";

import { useState, useEffect, useCallback } from "react";

type Therapist = { id: string; name: string };
type Rate = {
  id: string;
  therapist_id: string;
  commission_type: "percentage" | "tiered" | "tiered_per_client" | "flat_per_session" | "event" | "workshop_pct";
  commission_rate: number | null;
  flat_amount: number | null;
  free_sessions: number;
  tier_config: { threshold: number; rate: number }[] | null;
};
type Appointment = {
  id: string;
  client_id: string;
  therapist_id: string;
  session_fee: number | null;
  status: string;
  scheduled_at: string | null;
  booking_status: string;
};
type Workshop = {
  id: string;
  therapist_id: string;
  title: string;
  scheduled_at: string;
  total_fee: number;
  status: string;
};
type BreakdownItem = {
  date: string;
  label: string;
  fee: number;
  commission: number;
  type: "session" | "workshop";
};
type SalaryRow = {
  therapist: Therapist;
  sessionRate: Rate | null;
  workshopRate: Rate | null;
  sessions: number;
  workshops: number;
  gross: number;
  commission: number;
  net: number;
  breakdown: BreakdownItem[];
};

function calcSessionCommission(
  rate: Rate | null,
  sessions: Appointment[],
  allAppointments: Appointment[]
): { commission: number; breakdown: BreakdownItem[] } {
  if (!rate || sessions.length === 0) return { commission: 0, breakdown: [] };

  const sorted = [...sessions].sort(
    (a, b) => new Date(a.scheduled_at ?? 0).getTime() - new Date(b.scheduled_at ?? 0).getTime()
  );

  // Pre-build completed set for quick lookup (for tiered_per_client)
  const completedAll = allAppointments.filter(
    (a) => a.status === "completed" || a.booking_status === "locked"
  );

  const breakdown: BreakdownItem[] = [];
  let totalCommission = 0;

  sorted.forEach((appt, idx) => {
    const fee = appt.session_fee ?? 0;
    let c = 0;
    const sessionNum = idx + 1;

    if (rate.commission_type === "percentage") {
      c = fee * (rate.commission_rate ?? 0);
    } else if (rate.commission_type === "flat_per_session") {
      const freeN = rate.free_sessions ?? 0;
      c = sessionNum <= freeN ? 0 : (rate.flat_amount ?? 0);
    } else if (rate.commission_type === "tiered" && rate.tier_config) {
      const tiers = [...rate.tier_config].sort((a, b) => a.threshold - b.threshold);
      let applicableRate = tiers[0]?.rate ?? 0;
      for (const tier of tiers) {
        if (sessionNum >= tier.threshold) applicableRate = tier.rate;
      }
      c = fee * applicableRate;
    } else if (rate.commission_type === "tiered_per_client" && rate.tier_config) {
      // Count all completed sessions for this client with this therapist up to and including this date
      const apptDate = new Date(appt.scheduled_at ?? 0).getTime();
      const clientCount = completedAll.filter(
        (a) =>
          a.client_id === appt.client_id &&
          a.therapist_id === appt.therapist_id &&
          new Date(a.scheduled_at ?? 0).getTime() <= apptDate
      ).length;
      const tiers = [...rate.tier_config].sort((a, b) => a.threshold - b.threshold);
      let applicableRate = tiers[0]?.rate ?? 0;
      for (const tier of tiers) {
        if (clientCount >= tier.threshold) applicableRate = tier.rate;
      }
      c = fee * applicableRate;
    }

    totalCommission += c;
    breakdown.push({
      date: appt.scheduled_at ? new Date(appt.scheduled_at).toLocaleDateString("zh-TW") : "—",
      label: "個人/伴侶諮商",
      fee,
      commission: Math.round(c),
      type: "session",
    });
  });

  return { commission: Math.round(totalCommission), breakdown };
}

function calcWorkshopCommission(
  rate: Rate | null,
  workshops: Workshop[]
): { commission: number; breakdown: BreakdownItem[] } {
  if (!rate || workshops.length === 0) return { commission: 0, breakdown: [] };

  const breakdown: BreakdownItem[] = [];
  let totalCommission = 0;

  workshops.forEach((w) => {
    const fee = w.total_fee ?? 0;
    const c = fee * (rate.commission_rate ?? 0);
    totalCommission += c;
    breakdown.push({
      date: new Date(w.scheduled_at).toLocaleDateString("zh-TW"),
      label: w.title,
      fee,
      commission: Math.round(c),
      type: "workshop",
    });
  });

  return { commission: Math.round(totalCommission), breakdown };
}

const COMMISSION_TYPE_LABEL: Record<string, string> = {
  percentage: "固定比例",
  tiered: "階梯式（月累計）",
  tiered_per_client: "階梯式（個案累計）",
  flat_per_session: "每次固定",
  event: "講座固定",
  workshop_pct: "講座比例",
};

export default function SalaryPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const calculate = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, rateRes, apptRes, workshopRes] = await Promise.all([
        fetch("/api/admin/therapists"),
        fetch("/api/admin/salary/rates"),
        fetch("/api/admin/appointments"),
        fetch("/api/admin/workshops"),
      ]);

      if (!tRes.ok || !apptRes.ok) return;

      const therapists: Therapist[] = await tRes.json();
      const allRates: Rate[] = rateRes.ok ? await rateRes.json() : [];
      const { appointments }: { appointments: Appointment[] } = await apptRes.json();
      const { workshops: allWorkshops }: { workshops: Workshop[] } = workshopRes.ok
        ? await workshopRes.json()
        : { workshops: [] };

      // Build rate maps (session and workshop are separate buckets)
      const sessionRateMap: Record<string, Rate> = {};
      const workshopRateMap: Record<string, Rate> = {};
      for (const r of allRates) {
        if (r.commission_type === "workshop_pct") {
          if (!workshopRateMap[r.therapist_id]) workshopRateMap[r.therapist_id] = r;
        } else if (r.commission_type !== "event") {
          if (!sessionRateMap[r.therapist_id]) sessionRateMap[r.therapist_id] = r;
        }
      }

      const result: SalaryRow[] = therapists.map((t) => {
        const sessionRate = sessionRateMap[t.id] ?? null;
        const workshopRate = workshopRateMap[t.id] ?? null;

        // Filter sessions for this therapist & month (completed/locked)
        const mySessions = appointments.filter((a) => {
          if (a.therapist_id !== t.id) return false;
          if (a.status !== "completed" && a.booking_status !== "locked") return false;
          if (!a.scheduled_at) return false;
          const d = new Date(a.scheduled_at);
          return d.getFullYear() === year && d.getMonth() + 1 === month;
        });

        // Filter completed workshops for this therapist & month
        const myWorkshops = allWorkshops.filter((w) => {
          if (w.therapist_id !== t.id) return false;
          if (w.status !== "completed") return false;
          const d = new Date(w.scheduled_at);
          return d.getFullYear() === year && d.getMonth() + 1 === month;
        });

        const sessionGross = mySessions.reduce((s, a) => s + (a.session_fee ?? 0), 0);
        const workshopGross = myWorkshops.reduce((s, w) => s + (w.total_fee ?? 0), 0);

        const { commission: sessionCommission, breakdown: sessionBreakdown } =
          calcSessionCommission(sessionRate, mySessions, appointments);
        const { commission: workshopCommission, breakdown: workshopBreakdown } =
          calcWorkshopCommission(workshopRate, myWorkshops);

        const gross = sessionGross + workshopGross;
        const commission = sessionCommission + workshopCommission;

        return {
          therapist: t,
          sessionRate,
          workshopRate,
          sessions: mySessions.length,
          workshops: myWorkshops.length,
          gross,
          commission,
          net: gross - commission,
          breakdown: [...sessionBreakdown, ...workshopBreakdown].sort(
            (a, b) => a.date.localeCompare(b.date)
          ),
        };
      });

      setRows(result);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { calculate(); }, [calculate]);

  const totalGross = rows.reduce((s, r) => s + r.gross, 0);
  const totalCommission = rows.reduce((s, r) => s + r.commission, 0);
  const totalNet = rows.reduce((s, r) => s + r.net, 0);

  return (
    <div className="space-y-6 pt-4">
      <div>
        <p className="font-sans text-xs text-muted mb-1">
          <a href="/admin" className="hover:text-forest">後台</a> / 薪酬系統
        </p>
        <h1 className="font-serif text-deep text-2xl">薪酬計算</h1>
        <p className="font-sans text-xs text-muted mt-0.5">
          依各心理師抽成設定，計算當月分成（含諮商及講座）。
        </p>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(+e.target.value)}
            className="border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50"
          >
            {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y} 年</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(+e.target.value)}
            className="border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m} 月</option>
            ))}
          </select>
        </div>
        <button
          onClick={calculate}
          disabled={loading}
          className="font-sans text-xs px-4 py-2 bg-deep text-paper hover:bg-forest disabled:opacity-40 transition-colors"
        >
          {loading ? "計算中…" : "重新計算"}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "總收費", value: totalGross, color: "text-deep" },
          { label: "心理師分成", value: totalCommission, color: "text-forest" },
          { label: "工作室淨收", value: totalNet, color: "text-muted" },
        ].map((item) => (
          <div key={item.label} className="bg-white border border-sand/20 p-4 text-center">
            <p className="font-sans text-[11px] text-muted mb-1">{item.label}</p>
            <p className={`font-serif text-xl ${item.color}`}>
              MOP {item.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Per therapist */}
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.therapist.id} className="bg-white border border-sand/20">
            <div
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-sand/5 transition-colors"
              onClick={() => setExpanded(expanded === row.therapist.id ? null : row.therapist.id)}
            >
              <div className="flex-1">
                <p className="font-serif text-deep">{row.therapist.name}</p>
                <p className="font-sans text-[11px] text-muted">
                  {[
                    row.sessionRate
                      ? `諮商：${COMMISSION_TYPE_LABEL[row.sessionRate.commission_type]}${
                          row.sessionRate.commission_type === "percentage" && row.sessionRate.commission_rate
                            ? ` ${Math.round(row.sessionRate.commission_rate * 100)}%`
                            : ""
                        }`
                      : "諮商：未設定",
                    row.workshopRate
                      ? `講座：${Math.round((row.workshopRate.commission_rate ?? 0) * 100)}%`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="grid grid-cols-5 gap-4 text-right font-sans text-sm">
                <div>
                  <p className="text-[10px] text-muted">諮商堂</p>
                  <p className="text-deep">{row.sessions}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted">講座場</p>
                  <p className="text-deep">{row.workshops}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted">總收費</p>
                  <p className="text-deep">{row.gross.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted">分成</p>
                  <p className="text-forest font-medium">{row.commission.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted">淨收</p>
                  <p className="text-muted">{row.net.toLocaleString()}</p>
                </div>
              </div>
              <span className="font-sans text-xs text-muted/40 flex-shrink-0">
                {expanded === row.therapist.id ? "▲" : "▼"}
              </span>
            </div>

            {/* Breakdown */}
            {expanded === row.therapist.id && (
              <div className="border-t border-sand/10 px-4 pb-4 pt-3">
                {row.breakdown.length === 0 ? (
                  <p className="font-sans text-xs text-muted/40">本月無已完成紀錄。</p>
                ) : (
                  <table className="w-full font-sans text-xs">
                    <thead>
                      <tr className="text-muted/60">
                        <th className="text-left py-1 font-normal">日期</th>
                        <th className="text-left py-1 font-normal">項目</th>
                        <th className="text-right py-1 font-normal">收費</th>
                        <th className="text-right py-1 font-normal">心理師分成</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.breakdown.map((b, i) => (
                        <tr key={i} className="border-t border-sand/10">
                          <td className="py-1.5 text-muted w-24">{b.date}</td>
                          <td className="py-1.5 text-muted">
                            {b.type === "workshop" ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5">講座</span>
                                {b.label}
                              </span>
                            ) : (
                              b.label
                            )}
                          </td>
                          <td className="py-1.5 text-right text-deep">{b.fee.toLocaleString()}</td>
                          <td className="py-1.5 text-right text-forest">{b.commission.toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-sand/30 font-medium">
                        <td colSpan={2} className="py-2 text-muted">合計</td>
                        <td className="py-2 text-right text-deep">{row.gross.toLocaleString()}</td>
                        <td className="py-2 text-right text-forest">{row.commission.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
                {row.sessions > 0 && !row.sessionRate && (
                  <p className="font-sans text-xs text-amber-600 bg-amber-50 px-3 py-2 mt-2">
                    此心理師尚未設定諮商抽成，無法計算諮商分成。請至成員資料設定。
                  </p>
                )}
                {row.workshops > 0 && !row.workshopRate && (
                  <p className="font-sans text-xs text-amber-600 bg-amber-50 px-3 py-2 mt-2">
                    此心理師尚未設定講座抽成，無法計算講座分成。請至成員資料設定。
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {rows.length === 0 && (
          <div className="text-center py-12 font-sans text-xs text-muted/40">
            尚未建立任何心理師資料。
          </div>
        )}
      </div>

      {/* Rate setup notice */}
      <div className="bg-sand/10 border border-sand/20 px-4 py-3">
        <p className="font-sans text-xs text-deep font-medium">設定抽成模式</p>
        <p className="font-sans text-[11px] text-muted mt-1">
          各心理師的抽成設定可在成員資料頁面中設定。諮商與講座各自獨立，互不影響。
        </p>
        <div className="flex gap-4 mt-1">
          <a href="/admin/members" className="font-sans text-[11px] text-forest hover:underline">
            前往成員資料 →
          </a>
          <a href="/admin/workshops" className="font-sans text-[11px] text-forest hover:underline">
            前往講座記錄 →
          </a>
        </div>
      </div>
    </div>
  );
}
