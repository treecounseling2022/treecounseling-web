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

  const FIELD_LABEL: Record<string, string> = {
    gender: "性別", birthday: "出生日期", city: "居住城市",
    contactType: "聯絡方式", contactId: "聯絡帳號", meetingType: "晤談方式",
    nativeLanguage: "母語", devices: "可使用設備", preferredTherapist: "偏好心理師",
  };
  const VALUE_MAP: Record<string, string> = {
    face: "面談", online: "線上晤談", whatsapp: "WhatsApp",
    cantonese: "粵語", mandarin: "普通話 / 國語", english: "英語",
    yes: "有", no: "沒有",
  };
  const fmtVal = (v: unknown): string => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "string") return (VALUE_MAP[v] ?? v) || "—";
    if (Array.isArray(v)) return (v as string[]).map((i) => VALUE_MAP[i] ?? i).join("、") || "—";
    return String(v);
  };

  const formData = inquiry.form_data as Record<string, unknown>;
  const skip = new Set(["serviceType", "name", "email", "phone", "preferredTimes", "concern", "signature", "individualDetails", "coupleDetails", "otherDetails"]);
  const extra = Object.entries(formData).filter(([k]) => !skip.has(k));
  const sig = formData.signature as string | undefined;
  const ind = formData.individualDetails as Record<string, unknown> | undefined;
  const couple = formData.coupleDetails as Record<string, unknown> | undefined;
  const other = formData.otherDetails as Record<string, unknown> | undefined;

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
            <h2>基本資料（補充）</h2>
            {extra.map(([k, v]) => (
              <div key={k} className="field">
                <span className="field-label">{FIELD_LABEL[k] ?? k}</span>
                <span style={{ whiteSpace: "pre-wrap" }}>{fmtVal(v)}</span>
              </div>
            ))}
          </>
        )}

        {ind && (
          <>
            <h2>困擾詳情</h2>
            {Object.entries(ind).map(([k, v]) => {
              const IL: Record<string, string> = {
                mainCategories: "困擾類型", subCategories: "困擾細項",
                behaviorFrequency: "成癮頻率", behaviorImpact: "成癮影響",
                hasPsychiatryExp: "曾有精神科就診", psychiatryDetails: "精神科說明",
                hasCounselingExp: "曾有輔導經驗", counselingDetails: "輔導經歷說明",
                therapistRequirements: "對心理師要求",
              };
              return (
                <div key={k} className="field">
                  <span className="field-label">{IL[k] ?? k}</span>
                  <span style={{ whiteSpace: "pre-wrap" }}>{fmtVal(v)}</span>
                </div>
              );
            })}
          </>
        )}

        {couple && (
          <>
            <h2>伴侶資料</h2>
            {(couple.partnerA as Record<string, unknown> | undefined) && (
              <>
                <p style={{ fontSize: "0.8rem", color: "#5a8a6a", margin: "8px 0 4px", fontWeight: 600 }}>伴侶 A</p>
                {Object.entries(couple.partnerA as Record<string, unknown>).map(([k, v]) => (
                  <div key={k} className="field"><span className="field-label">{k}</span><span>{fmtVal(v)}</span></div>
                ))}
              </>
            )}
            {(couple.partnerB as Record<string, unknown> | undefined) && (
              <>
                <p style={{ fontSize: "0.8rem", color: "#5a8a6a", margin: "8px 0 4px", fontWeight: 600 }}>伴侶 B</p>
                {Object.entries(couple.partnerB as Record<string, unknown>).map(([k, v]) => (
                  <div key={k} className="field"><span className="field-label">{k}</span><span>{fmtVal(v)}</span></div>
                ))}
              </>
            )}
            {couple.issues && <div className="field"><span className="field-label">遇到的狀況</span><span>{fmtVal(couple.issues)}</span></div>}
            {couple.duration && <div className="field"><span className="field-label">關係時長</span><span>{fmtVal(couple.duration)}</span></div>}
          </>
        )}

        {other && (
          <>
            <h2>機構合作資料</h2>
            {Object.entries(other).map(([k, v]) => {
              const OL: Record<string, string> = { companyName: "機構名稱", contactPerson: "聯絡人", contactType: "聯絡方式", contactId: "聯絡帳號", theme: "項目主題" };
              return <div key={k} className="field"><span className="field-label">{OL[k] ?? k}</span><span>{fmtVal(v)}</span></div>;
            })}
          </>
        )}

        {sig && sig.startsWith("data:image/") && (
          <>
            <h2>知情同意簽名</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sig} alt="簽名" style={{ maxWidth: 280, border: "1px solid #e0dcd4", display: "block" }} />
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
