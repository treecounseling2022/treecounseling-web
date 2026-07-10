// 共用薪酬抽成計算邏輯，供 /admin/salary（所長）與 /admin/my-salary（心理師）共用，
// 避免兩邊各自實作、算法逐漸分歧（H8）。
// commission = 心理師拿到的分成金額（非工作室抽成），依 TherapistProfileEditor 設定畫面的用語為準。

export type CommissionType =
  | "percentage"
  | "tiered"
  | "tiered_per_client"
  | "flat_per_session"
  | "event"
  | "workshop_pct";

export type TierRow = { threshold: number; rate: number };

export type Rate = {
  id: string;
  therapist_id?: string;
  commission_type: CommissionType;
  commission_rate: number | null;
  flat_amount: number | null;
  free_sessions: number;
  tier_config: TierRow[] | null;
  effective_from: string;
  effective_to: string | null;
};

export const COMMISSION_TYPE_LABEL: Record<string, string> = {
  percentage: "固定比例",
  tiered: "階梯式（月累計）",
  tiered_per_client: "階梯式（個案累計）",
  flat_per_session: "每次固定",
  event: "講座固定",
  workshop_pct: "講座比例",
};

// 依場次日期挑出當時生效的費率設定：effective_from <= date，且 date < effective_to（null 表示現行）
export function pickRateForDate(rates: Rate[], dateIso: string): Rate | null {
  const d = new Date(dateIso).getTime();
  const candidates = rates.filter((r) => {
    const from = new Date(r.effective_from).getTime();
    if (isNaN(from) || d < from) return false;
    if (r.effective_to) {
      const to = new Date(r.effective_to).getTime();
      if (!isNaN(to) && d >= to) return false;
    }
    return true;
  });
  if (candidates.length === 0) return null;
  return candidates.sort(
    (a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
  )[0];
}

export type AppointmentLike = {
  id: string;
  client_id: string;
  therapist_id: string;
  session_fee: number | null;
  scheduled_at: string | null;
  booking_status: string;
  status: string;
  couple_session_type?: "joint" | "individual_a" | "individual_b" | null;
};

export type WorkshopLike = {
  id: string;
  therapist_id: string;
  title: string;
  scheduled_at: string;
  total_fee: number;
};

export type BreakdownItem = {
  id: string;
  date: string;
  label: string;
  fee: number;
  commission: number;
  type: "session" | "workshop";
};

// rates：該心理師「諮商場次」類型的完整費率歷史（含已失效的舊費率，用來對應舊月份）
// sessions：要計算薪酬的場次（已篩選好月份/狀態）
// allAppointments：該心理師（或全公司）所有已計入的場次，供 tiered_per_client 累計次數用
// priorSessionsMap：client_id → 舊系統匯入的累計次數 offset
export function calcSessionCommission(
  rates: Rate[],
  sessions: AppointmentLike[],
  allAppointments: AppointmentLike[],
  priorSessionsMap: Record<string, number> = {}
): { commission: number; breakdown: BreakdownItem[] } {
  if (sessions.length === 0) return { commission: 0, breakdown: [] };

  const sorted = [...sessions].sort(
    (a, b) => new Date(a.scheduled_at ?? 0).getTime() - new Date(b.scheduled_at ?? 0).getTime()
  );

  const countedAll = allAppointments.filter(
    (a) =>
      a.status !== "no_show" &&
      (a.booking_status === "confirmed" ||
        a.booking_status === "locked" ||
        a.status === "completed")
  );

  const breakdown: BreakdownItem[] = [];
  let totalCommission = 0;

  sorted.forEach((appt, idx) => {
    const rate = pickRateForDate(rates, appt.scheduled_at ?? new Date().toISOString());
    const fee = appt.session_fee ?? 0;
    let c = 0;
    const sessionNum = idx + 1;

    if (rate) {
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
        const apptDate = new Date(appt.scheduled_at ?? 0).getTime();
        const systemCount = countedAll.filter(
          (a) =>
            a.client_id === appt.client_id &&
            a.therapist_id === appt.therapist_id &&
            new Date(a.scheduled_at ?? 0).getTime() <= apptDate
        ).length;
        const priorOffset = priorSessionsMap[appt.client_id] ?? 0;
        const clientCount = priorOffset + systemCount;
        const tiers = [...rate.tier_config].sort((a, b) => a.threshold - b.threshold);
        let applicableRate = tiers[0]?.rate ?? 0;
        for (const tier of tiers) {
          if (clientCount >= tier.threshold) applicableRate = tier.rate;
        }
        c = fee * applicableRate;
      }
    }

    totalCommission += c;
    const sessionLabel =
      appt.couple_session_type === "joint" ? "伴侶諮商（雙方）" :
      appt.couple_session_type === "individual_a" ? "伴侶個人諮商（A 方）" :
      appt.couple_session_type === "individual_b" ? "伴侶個人諮商（B 方）" :
      "個人諮商";

    breakdown.push({
      id: appt.id,
      date: appt.scheduled_at ? new Date(appt.scheduled_at).toISOString().slice(0, 10) : "—",
      label: sessionLabel,
      fee,
      commission: Math.round(c),
      type: "session",
    });
  });

  return { commission: Math.round(totalCommission), breakdown };
}

export function calcWorkshopCommission(
  rates: Rate[],
  workshops: WorkshopLike[]
): { commission: number; breakdown: BreakdownItem[] } {
  if (workshops.length === 0) return { commission: 0, breakdown: [] };

  const breakdown: BreakdownItem[] = [];
  let totalCommission = 0;

  workshops.forEach((w) => {
    const rate = pickRateForDate(rates, w.scheduled_at);
    const fee = w.total_fee ?? 0;
    const c = rate ? fee * (rate.commission_rate ?? 0) : 0;
    totalCommission += c;
    breakdown.push({
      id: w.id,
      date: new Date(w.scheduled_at).toISOString().slice(0, 10),
      label: w.title,
      fee,
      commission: Math.round(c),
      type: "workshop",
    });
  });

  return { commission: Math.round(totalCommission), breakdown };
}
