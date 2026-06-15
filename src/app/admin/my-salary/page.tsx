"use client";

import { useState, useEffect, useCallback } from "react";

type Rate = {
  id: string;
  commission_type: "percentage" | "tiered" | "tiered_per_client" | "flat_per_session" | "event" | "workshop_pct";
  commission_rate: number | null;
  flat_amount: number | null;
  free_sessions: number;
  tier_config: { threshold: number; rate: number }[] | null;
};

type Session = {
  id: string;
  client_id: string;
  scheduled_at: string | null;
  session_fee: number | null;
  booking_status: string;
  status: string;
  clients: { full_name: string } | null;
};

type BreakdownItem = {
  date: string;
  clientName: string;
  fee: number;
  commission: number;
};

const COMMISSION_TYPE_LABEL: Record<string, string> = {
  percentage: "固定比例",
  tiered: "階梯式（月累計）",
  tiered_per_client: "階梯式（個案累計）",
  flat_per_session: "每次固定",
  event: "講座固定",
  workshop_pct: "講座比例",
};

function calcCommission(rate: Rate, sessions: Session[]): { total: number; breakdown: BreakdownItem[] } {
  if (!rate || sessions.length === 0) return { total: 0, breakdown: [] };

  const sorted = [...sessions].sort(
    (a, b) => new Date(a.scheduled_at ?? 0).getTime() - new Date(b.scheduled_at ?? 0).getTime()
  );

  const breakdown: BreakdownItem[] = [];
  let total = 0;

  sorted.forEach((s, idx) => {
    const fee = s.session_fee ?? 0;
    let c = 0;
    const n = idx + 1;

    if (rate.commission_type === "percentage") {
      c = fee * (rate.commission_rate ?? 0);
    } else if (rate.commission_type === "flat_per_session") {
      c = n <= (rate.free_sessions ?? 0) ? 0 : (rate.flat_amount ?? 0);
    } else if ((rate.commission_type === "tiered" || rate.commission_type === "tiered_per_client") && rate.tier_config) {
      const tiers = [...rate.tier_config].sort((a, b) => a.threshold - b.threshold);
      let r = tiers[0]?.rate ?? 0;
      for (const tier of tiers) {
        if (n >= tier.threshold) r = tier.rate;
      }
      c = fee * r;
    }

    total += c;
    breakdown.push({
      date: s.scheduled_at ? new Date(s.scheduled_at).toLocaleDateString("zh-TW") : "—",
      clientName: s.clients?.full_name ?? "—",
      fee,
      commission: Math.round(c),
    });
  });

  return { total: Math.round(total), breakdown };
}

export default function MySalaryPage() {
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [myId, setMyId] = useState<string | null>(null);
  const [rate, setRate] = useState<Rate | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/admin/me");
      if (!meRes.ok) return;
      const me = await meRes.json();
      if (!me.profileId) return;
      setMyId(me.profileId);

      const [ratesRes, apptRes] = await Promise.all([
        fetch(`/api/admin/salary/rates/${me.profileId}`),
        fetch(`/api/admin/appointments`),
      ]);

      if (ratesRes.ok) {
        const ratesData = await ratesRes.json() as { session: Rate[]; event: Rate[]; workshop: Rate[] };
        // Get the most recent active session rate
        const sessionRates = ratesData.session ?? [];
        const activeRate = sessionRates.find((r) => !("effective_to" in r && r)) ?? sessionRates[0] ?? null;
        setRate(activeRate);
      }

      if (apptRes.ok) {
        const apptData = await apptRes.json();
        const [y, m] = month.split("-").map(Number);
        const filtered = (apptData.appointments as Session[]).filter((a) => {
          if (!a.scheduled_at) return false;
          const d = new Date(a.scheduled_at);
          const counted =
            a.booking_status === "confirmed" ||
            a.booking_status === "locked" ||
            a.status === "completed";
          return d.getFullYear() === y && d.getMonth() + 1 === m && counted;
        });
        setSessions(filtered);
      }
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const { total, breakdown } = rate
    ? calcCommission(rate, sessions)
    : { total: 0, breakdown: [] };

  const gross = sessions.reduce((s, a) => s + (a.session_fee ?? 0), 0);
  const net = gross - total;

  if (loading) {
    return (
      <div className="pt-4 space-y-4">
        <h1 className="font-serif text-deep text-2xl">我的薪酬</h1>
        <p className="font-sans text-xs text-muted">載入中…</p>
      </div>
    );
  }

  if (!myId) {
    return (
      <div className="pt-4 space-y-4">
        <h1 className="font-serif text-deep text-2xl">我的薪酬</h1>
        <p className="font-sans text-sm text-red-500">帳號尚未連結至心理師資料，無法查看薪酬。</p>
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="font-sans text-xs text-muted mb-1">
            <a href="/admin" className="hover:text-forest">後台</a> / 我的薪酬
          </p>
          <h1 className="font-serif text-deep text-2xl">我的薪酬</h1>
          <p className="font-sans text-xs text-muted mt-0.5">查看指定月份的諮商費用及抽成明細。</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border border-sand/30 px-3 py-2 font-sans text-sm text-deep focus:outline-none focus:border-forest/50 bg-white"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "諮商堂數", value: `${sessions.length} 堂`, sub: `${month.replace("-", " 年 ")} 月` },
          { label: "個案收費總額", value: `MOP ${gross.toLocaleString()}`, sub: "（全部費用）" },
          { label: "工作室抽成", value: `MOP ${total.toLocaleString()}`, sub: rate ? COMMISSION_TYPE_LABEL[rate.commission_type] : "未設定" },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-sand/20 p-5">
            <p className="font-sans text-xs text-muted">{c.label}</p>
            <p className="font-serif text-deep text-2xl mt-1">{c.value}</p>
            <p className="font-sans text-[11px] text-muted/60 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Net income highlight */}
      <div className="bg-forest/10 border border-forest/20 p-5 flex items-center justify-between">
        <div>
          <p className="font-sans text-xs text-forest/70">本月實收（預估）</p>
          <p className="font-serif text-forest text-3xl mt-1">MOP {net.toLocaleString()}</p>
          <p className="font-sans text-[11px] text-muted/60 mt-0.5">收費總額 − 工作室抽成</p>
        </div>
        {!rate && (
          <p className="font-sans text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2">
            尚未設定抽成方案，請聯繫行政
          </p>
        )}
      </div>

      {/* Breakdown */}
      {breakdown.length > 0 && (
        <div className="bg-white border border-sand/20">
          <button
            onClick={() => setShowBreakdown((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 font-sans text-sm text-deep hover:bg-sand/10 transition-colors"
          >
            <span>晤談明細（{breakdown.length} 筆）</span>
            <span className="text-muted text-xs">{showBreakdown ? "▲ 收起" : "▼ 展開"}</span>
          </button>
          {showBreakdown && (
            <div className="border-t border-sand/20">
              <table className="w-full text-xs font-sans">
                <thead className="bg-sand/10">
                  <tr>
                    <th className="text-left px-4 py-2 text-muted font-medium">日期</th>
                    <th className="text-left px-4 py-2 text-muted font-medium">個案</th>
                    <th className="text-right px-4 py-2 text-muted font-medium">費用</th>
                    <th className="text-right px-4 py-2 text-muted font-medium">抽成</th>
                    <th className="text-right px-4 py-2 text-muted font-medium">實收</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((b, i) => (
                    <tr key={i} className="border-t border-sand/10">
                      <td className="px-4 py-2 text-muted">{b.date}</td>
                      <td className="px-4 py-2 text-deep">{b.clientName}</td>
                      <td className="px-4 py-2 text-right text-deep">{b.fee}</td>
                      <td className="px-4 py-2 text-right text-red-500">−{b.commission}</td>
                      <td className="px-4 py-2 text-right text-forest font-medium">{b.fee - b.commission}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-sand/10 border-t border-sand/20">
                  <tr>
                    <td colSpan={2} className="px-4 py-2 font-medium text-deep">合計</td>
                    <td className="px-4 py-2 text-right font-medium text-deep">{gross}</td>
                    <td className="px-4 py-2 text-right font-medium text-red-500">−{total}</td>
                    <td className="px-4 py-2 text-right font-medium text-forest">{net}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {sessions.length === 0 && (
        <div className="text-center py-16 font-sans text-xs text-muted/40 bg-white border border-sand/20">
          本月無已確認的晤談記錄。
        </div>
      )}
    </div>
  );
}
