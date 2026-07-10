"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type Rate,
  type AppointmentLike,
  COMMISSION_TYPE_LABEL,
  calcSessionCommission,
} from "@/lib/commission";

type Session = AppointmentLike & {
  clients: { full_name: string } | null;
};

export default function MySalaryPage() {
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [myId, setMyId] = useState<string | null>(null);
  const [sessionRates, setSessionRates] = useState<Rate[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [priorSessionsMap, setPriorSessionsMap] = useState<Record<string, number>>({});
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

      const [ratesRes, apptRes, clientsRes] = await Promise.all([
        fetch(`/api/admin/salary/rates/${me.profileId}`),
        fetch(`/api/admin/appointments`),
        fetch(`/api/admin/clients`),
      ]);

      if (ratesRes.ok) {
        const ratesData = await ratesRes.json() as { session: Rate[]; event: Rate[]; workshop: Rate[] };
        setSessionRates(ratesData.session ?? []);
      }

      if (clientsRes.ok) {
        const clientList: { id: string; prior_sessions?: number }[] = await clientsRes.json();
        const map: Record<string, number> = {};
        for (const c of clientList) {
          if (c.prior_sessions) map[c.id] = c.prior_sessions;
        }
        setPriorSessionsMap(map);
      }

      if (apptRes.ok) {
        const apptData = await apptRes.json();
        const all = apptData.appointments as Session[];
        setAllSessions(all);
        const [y, m] = month.split("-").map(Number);
        const filtered = all.filter((a) => {
          if (!a.scheduled_at) return false;
          const d = new Date(a.scheduled_at);
          const counted =
            a.status !== "no_show" &&
            (a.booking_status === "confirmed" ||
              a.booking_status === "locked" ||
              a.status === "completed");
          return d.getFullYear() === y && d.getMonth() + 1 === m && counted;
        });
        setSessions(filtered);
      }
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const { commission: total, breakdown } = calcSessionCommission(
    sessionRates,
    sessions,
    allSessions,
    priorSessionsMap
  );
  const currentRate = sessionRates.find((r) => !r.effective_to) ?? null;

  const gross = sessions.reduce((s, a) => s + (a.session_fee ?? 0), 0);
  const clientNameByAppt = new Map(sessions.map((s) => [s.id, s.clients?.full_name ?? "—"]));

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
          { label: "諮商次數", value: `${sessions.length} 次`, sub: `${month.replace("-", " 年 ")} 月` },
          { label: "個案收費總額", value: `MOP ${gross.toLocaleString()}`, sub: "（全部費用）" },
          { label: "我的分成", value: `MOP ${total.toLocaleString()}`, sub: currentRate ? COMMISSION_TYPE_LABEL[currentRate.commission_type] : "未設定" },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-sand/20 p-5">
            <p className="font-sans text-xs text-muted">{c.label}</p>
            <p className="font-serif text-deep text-2xl mt-1">{c.value}</p>
            <p className="font-sans text-[11px] text-muted/60 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Income highlight */}
      <div className="bg-forest/10 border border-forest/20 p-5 flex items-center justify-between">
        <div>
          <p className="font-sans text-xs text-forest/70">本月預估收入</p>
          <p className="font-serif text-forest text-3xl mt-1">MOP {total.toLocaleString()}</p>
          <p className="font-sans text-[11px] text-muted/60 mt-0.5">依抽成方案計算（{currentRate ? COMMISSION_TYPE_LABEL[currentRate.commission_type] : "未設定"}）</p>
        </div>
        {!currentRate && (
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
                    <th className="text-right px-4 py-2 text-muted font-medium">我的分成</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((b, i) => (
                    <tr key={i} className="border-t border-sand/10">
                      <td className="px-4 py-2 text-muted">{new Date(b.date).toLocaleDateString("zh-TW")}</td>
                      <td className="px-4 py-2 text-deep">{clientNameByAppt.get(b.id) ?? b.label}</td>
                      <td className="px-4 py-2 text-right text-deep">{b.fee}</td>
                      <td className="px-4 py-2 text-right text-forest font-medium">{b.commission}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-sand/10 border-t border-sand/20">
                  <tr>
                    <td colSpan={2} className="px-4 py-2 font-medium text-deep">合計</td>
                    <td className="px-4 py-2 text-right font-medium text-deep">{gross}</td>
                    <td className="px-4 py-2 text-right font-medium text-forest">{total}</td>
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
