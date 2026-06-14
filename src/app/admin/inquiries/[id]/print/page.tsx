import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, isAdminLevel } from "@/lib/auth-role";
import { notFound } from "next/navigation";
import PrintTrigger from "./PrintTrigger";

export default async function InquiryPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requireAuth();
  if (!isAdminLevel(auth.role)) notFound();

  const { id } = await params;
  const db = createAdminClient();

  const { data: inquiry } = await db
    .from("booking_inquiries")
    .select("*")
    .eq("id", id)
    .single();

  if (!inquiry) notFound();

  const SERVICE_LABEL: Record<string, string> = {
    individual: "個人心理輔導",
    couple: "伴侶心理輔導",
    hoarding: "囤積者查詢",
    workshop: "講座 / 工作坊",
    proposal: "方案與計劃",
    other: "其他查詢",
  };

  const fmt = (v: unknown): string => {
    if (v == null) return "—";
    if (typeof v === "string") return v || "—";
    if (Array.isArray(v)) return (v as string[]).join("、");
    return JSON.stringify(v);
  };

  const skip = new Set(["serviceType", "name", "email", "phone", "preferredTimes", "concern"]);
  const extra = Object.entries(inquiry.form_data as Record<string, unknown>).filter(([k]) => !skip.has(k));

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          header { display: none !important; }
          main { padding: 0 !important; max-width: none !important; }
          body { margin: 0; }
        }
        body { font-family: 'Noto Sans TC', sans-serif; color: #222; line-height: 1.7; }
        h1 { font-size: 1.5rem; margin-bottom: 2px; }
        h2 { font-size: 0.9rem; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-top: 20px; color: #555; text-transform: uppercase; letter-spacing: 0.05em; }
        .meta { color: #888; font-size: 0.8rem; }
        .field { display: grid; grid-template-columns: 120px 1fr; gap: 0 12px; margin-bottom: 4px; font-size: 0.9rem; }
        .field-label { color: #888; }
        .concern { background: #f7f5ef; padding: 12px 16px; border-left: 3px solid #5a8a6a; white-space: pre-wrap; font-size: 0.9rem; line-height: 1.8; }
        .page { max-width: 680px; margin: 32px auto; padding: 0 24px; }
        .footer { margin-top: 40px; color: #bbb; font-size: 0.75rem; border-top: 1px solid #eee; padding-top: 8px; }
      `}</style>

      <div className="page">
        <PrintTrigger backUrl={`/admin/inquiries/${inquiry.id}`} />

        <h1>{inquiry.name ?? "（未填姓名）"}</h1>
        <p className="meta">
          申請時間：{new Date(inquiry.created_at).toLocaleString("zh-TW")} ｜
          服務：{SERVICE_LABEL[inquiry.service_type] ?? inquiry.service_type} ｜
          狀態：{inquiry.status}
        </p>

        <h2>基本資料</h2>
        <div className="field"><span className="field-label">Email</span><span>{inquiry.email ?? "—"}</span></div>
        <div className="field"><span className="field-label">電話</span><span>{inquiry.phone ?? "—"}</span></div>
        {inquiry.preferred_times && (
          <div className="field"><span className="field-label">偏好時段</span><span>{inquiry.preferred_times}</span></div>
        )}

        {inquiry.concern && (
          <>
            <h2>困擾說明與 AI 對話摘要</h2>
            <div className="concern">{inquiry.concern}</div>
          </>
        )}

        {extra.length > 0 && (
          <>
            <h2>詳細表單資料</h2>
            {extra.map(([k, v]) => (
              <div key={k} className="field">
                <span className="field-label">{k}</span>
                <span style={{ whiteSpace: "pre-wrap" }}>{fmt(v)}</span>
              </div>
            ))}
          </>
        )}

        {inquiry.admin_notes && (
          <>
            <h2>行政備註</h2>
            <p style={{ fontSize: "0.9rem" }}>{inquiry.admin_notes}</p>
          </>
        )}

        <div className="footer">
          樹心理工作室 · 匯出時間：{new Date().toLocaleString("zh-TW")}
        </div>
      </div>
    </>
  );
}
