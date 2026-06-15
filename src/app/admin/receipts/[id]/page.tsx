import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, isAdminLevel } from "@/lib/auth-role";
import PrintButton from "./PrintButton";

const METHOD_LABEL: Record<string, string> = {
  cash: "現金 Cash",
  transfer: "銀行轉帳 Bank Transfer",
  card: "信用卡 Credit Card",
  other: "其他 Other",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReceiptPage({ params }: Props) {
  const auth = await requireAuth();
  if (!isAdminLevel(auth.role)) notFound();

  const { id } = await params;
  const db = createAdminClient();

  const { data: payment } = await db
    .from("payments")
    .select("*")
    .eq("id", id)
    .single();

  if (!payment || payment.status !== "paid") notFound();

  const [{ data: appt }, { data: client }] = await Promise.all([
    db.from("appointments")
      .select("scheduled_at, therapist_id, session_fee, currency")
      .eq("id", payment.appointment_id)
      .single(),
    db.from("clients")
      .select("full_name, client_code")
      .eq("id", payment.client_id)
      .single(),
  ]);

  let therapistName = "";
  if (appt?.therapist_id) {
    const { data: t } = await db
      .from("therapist_profiles")
      .select("name")
      .eq("id", appt.therapist_id)
      .single();
    therapistName = t?.name ?? "";
  }

  const receiptNo = `R-${payment.id.slice(0, 8).toUpperCase()}`;
  const paidDate = payment.paid_at
    ? new Date(payment.paid_at).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" });
  const sessionDate = appt?.scheduled_at
    ? new Date(appt.scheduled_at).toLocaleString("zh-TW", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  return (
    <>
      {/* Admin toolbar — hidden when printing */}
      <div className="print:hidden flex items-center gap-3 px-6 py-3 bg-sand/10 border-b border-sand/20 mb-6">
        <a href={`/admin/clients/${payment.client_id}`} className="font-sans text-xs text-muted hover:text-deep">← 返回個案</a>
        <PrintButton />
      </div>

      {/* Receipt — printable */}
      <div className="max-w-lg mx-auto px-8 py-10 print:p-0 print:max-w-none font-sans text-deep">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-serif text-2xl text-deep tracking-wide">樹心理工作室</h1>
            <p className="text-xs text-muted mt-1">treecounseling.com</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted uppercase tracking-widest">收據 Receipt</p>
            <p className="text-sm font-mono text-deep mt-1">{receiptNo}</p>
          </div>
        </div>

        <hr className="border-sand/30 mb-6" />

        {/* Details table */}
        <table className="w-full text-sm mb-8">
          <tbody className="divide-y divide-sand/10">
            <tr>
              <td className="py-2 pr-4 text-muted text-xs w-1/3">收據日期</td>
              <td className="py-2 text-deep">{paidDate}</td>
            </tr>
            {client?.full_name && (
              <tr>
                <td className="py-2 pr-4 text-muted text-xs">個案姓名</td>
                <td className="py-2 text-deep">
                  {client.full_name}
                  {client.client_code && <span className="ml-2 text-muted text-xs font-mono">#{client.client_code}</span>}
                </td>
              </tr>
            )}
            {therapistName && (
              <tr>
                <td className="py-2 pr-4 text-muted text-xs">負責心理師</td>
                <td className="py-2 text-deep">{therapistName}</td>
              </tr>
            )}
            <tr>
              <td className="py-2 pr-4 text-muted text-xs">服務日期</td>
              <td className="py-2 text-deep">{sessionDate}</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 text-muted text-xs">付款方式</td>
              <td className="py-2 text-deep">{METHOD_LABEL[payment.payment_method] ?? payment.payment_method}</td>
            </tr>
          </tbody>
        </table>

        {/* Amount */}
        <div className="bg-sand/10 px-5 py-4 flex items-center justify-between mb-8">
          <span className="text-sm text-muted">諮詢費用</span>
          <span className="font-serif text-xl text-deep">
            {payment.currency} {payment.amount.toLocaleString("zh-TW")}
          </span>
        </div>

        {/* Notes */}
        {payment.notes && (
          <p className="text-xs text-muted mb-8 border-l-2 border-sand/30 pl-3">
            備註：{payment.notes}
          </p>
        )}

        {/* Footer */}
        <div className="border-t border-sand/20 pt-6 text-center">
          <p className="text-xs text-muted/60">本收據由樹心理工作室出具，如有疑問請聯繫我們。</p>
          <p className="text-[10px] text-muted/40 mt-1">This receipt was issued by Tree Counseling Studio.</p>
        </div>
      </div>
    </>
  );
}
