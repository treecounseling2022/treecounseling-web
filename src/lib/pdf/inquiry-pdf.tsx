import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";

// Font served from public/ — accessible via HTTP on both dev and Vercel
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

Font.register({
  family: "NotoSansSC",
  src: `${SITE_URL}/fonts/NotoSansSC-Regular.ttf`,
});

const S = StyleSheet.create({
  page: {
    fontFamily: "NotoSansSC",
    padding: "48 52",
    fontSize: 10.5,
    color: "#333",
    lineHeight: 1.65,
  },
  header: { borderBottom: "1.5pt solid #2d4a38", paddingBottom: 10, marginBottom: 18 },
  title: { fontSize: 17, color: "#2d4a38", marginBottom: 3 },
  subtitle: { fontSize: 9, color: "#999" },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 9,
    color: "#5a8a6a",
    letterSpacing: 0.8,
    marginBottom: 6,
    borderBottom: "0.5pt solid #e8e4dc",
    paddingBottom: 3,
  },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 88, color: "#888", fontSize: 9.5 },
  value: { flex: 1, color: "#333" },
  concernBox: {
    backgroundColor: "#f7f5ef",
    padding: "10 12",
    borderLeft: "3pt solid #5a8a6a",
    marginTop: 4,
    lineHeight: 1.75,
    fontSize: 10,
  },
  partnerBox: {
    backgroundColor: "#f9f8f5",
    border: "0.5pt solid #e8e4dc",
    padding: 10,
    marginBottom: 8,
  },
  partnerTitle: { fontSize: 9.5, color: "#444", marginBottom: 6 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 2 },
  tag: {
    backgroundColor: "#e8f0eb",
    color: "#2d4a38",
    fontSize: 8.5,
    padding: "2 5",
    marginRight: 3,
    marginBottom: 3,
  },
  tagSecondary: { backgroundColor: "#f0ede8", color: "#666" },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 52,
    right: 52,
    borderTop: "0.5pt solid #e0ddd8",
    paddingTop: 6,
    color: "#bbb",
    fontSize: 7.5,
  },
});

const SERVICE_LABEL: Record<string, string> = {
  individual: "個人心理輔導",
  couple: "伴侶心理輔導",
  hoarding: "囤積者諮商查詢",
  workshop: "講座 / 工作坊",
  proposal: "方案與計劃撰寫",
  other: "其他行政查詢",
};

const GENDER_LABEL: Record<string, string> = {
  男: "男", 女: "女", 其他: "其他",
  male: "男", female: "女", other: "其他",
};

const LANG_LABEL: Record<string, string> = {
  cantonese: "粵語", mandarin: "普通話", english: "英語", other: "其他",
};

const MEETING_LABEL: Record<string, string> = {
  face: "面談", online: "線上晤談",
};

export type InquiryPDFData = {
  serviceType: string;
  preferredTimes?: string;
  submittedAt: string;
  // Individual / Hoarding
  name?: string;
  gender?: string;
  birthday?: string;
  city?: string;
  meetingType?: string;
  nativeLanguage?: string;
  preferredTherapist?: string;
  concern?: string;
  individualDetails?: {
    mainCategories?: string[];
    subCategories?: string[];
    hasPsychiatryExp?: string;
    psychiatryDetails?: string;
    hasCounselingExp?: string;
    counselingDetails?: string;
    therapistRequirements?: string;
  };
  // Couple
  coupleDetails?: {
    partnerA?: { name?: string; gender?: string; birthday?: string; language?: string };
    partnerB?: { name?: string; gender?: string; birthday?: string; language?: string };
    issues?: string[];
    duration?: string;
    children?: string;
    meetingType?: string;
  };
  // Workshop / Other
  otherDetails?: {
    companyName?: string;
    contactPerson?: string;
    theme?: string;
  };
};

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={S.row}>
      <Text style={S.label}>{label}</Text>
      <Text style={S.value}>{value}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={S.sectionTitle}>{children}</Text>;
}

function IndividualContent({ data }: { data: InquiryPDFData }) {
  const d = data.individualDetails;
  return (
    <>
      <View style={S.section}>
        <SectionTitle>個人基本資料</SectionTitle>
        <Row label="姓名" value={data.name} />
        <Row label="性別" value={GENDER_LABEL[data.gender ?? ""] ?? data.gender} />
        <Row label="出生日期" value={data.birthday} />
        <Row label="居住城市" value={data.city} />
        <Row label="晤談方式" value={MEETING_LABEL[data.meetingType ?? ""] ?? data.meetingType} />
        <Row label="母語" value={LANG_LABEL[data.nativeLanguage ?? ""] ?? data.nativeLanguage} />
        {data.preferredTherapist && (
          <Row label="偏好心理師" value={data.preferredTherapist} />
        )}
      </View>

      {d && (d.mainCategories?.length ?? 0) > 0 && (
        <View style={S.section}>
          <SectionTitle>困擾類型</SectionTitle>
          <View style={S.tagRow}>
            {(d.mainCategories ?? []).map((c) => (
              <Text key={c} style={S.tag}>{c}</Text>
            ))}
          </View>
          {(d.subCategories?.length ?? 0) > 0 && (
            <View style={[S.tagRow, { marginTop: 4 }]}>
              {(d.subCategories ?? []).map((s) => (
                <Text key={s} style={[S.tag, S.tagSecondary]}>{s}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {d && (d.hasPsychiatryExp || d.hasCounselingExp) && (
        <View style={S.section}>
          <SectionTitle>就診與輔導背景</SectionTitle>
          <Row label="精神科就診" value={d.hasPsychiatryExp === "yes" ? "有" : "無"} />
          {d.psychiatryDetails && <Row label="詳情" value={d.psychiatryDetails} />}
          <Row label="諮商輔導經驗" value={d.hasCounselingExp === "yes" ? "有" : "無"} />
          {d.counselingDetails && <Row label="詳情" value={d.counselingDetails} />}
          {d.therapistRequirements && <Row label="輔導師要求" value={d.therapistRequirements} />}
        </View>
      )}
    </>
  );
}

function CoupleContent({ data }: { data: InquiryPDFData }) {
  const c = data.coupleDetails;
  if (!c) return null;
  return (
    <>
      <View style={S.section}>
        <SectionTitle>雙方基本資料</SectionTitle>
        <View style={S.partnerBox}>
          <Text style={S.partnerTitle}>「A」</Text>
          <Row label="姓名" value={c.partnerA?.name} />
          <Row label="性別" value={GENDER_LABEL[c.partnerA?.gender ?? ""] ?? c.partnerA?.gender} />
          <Row label="出生日期" value={c.partnerA?.birthday} />
          <Row label="母語" value={LANG_LABEL[c.partnerA?.language ?? ""] ?? c.partnerA?.language} />
        </View>
        <View style={S.partnerBox}>
          <Text style={S.partnerTitle}>「B」</Text>
          <Row label="姓名" value={c.partnerB?.name} />
          <Row label="性別" value={GENDER_LABEL[c.partnerB?.gender ?? ""] ?? c.partnerB?.gender} />
          <Row label="出生日期" value={c.partnerB?.birthday} />
          <Row label="母語" value={LANG_LABEL[c.partnerB?.language ?? ""] ?? c.partnerB?.language} />
        </View>
      </View>

      <View style={S.section}>
        <SectionTitle>關係狀況</SectionTitle>
        <Row label="關係時長" value={c.duration} />
        {c.children && <Row label="子女" value={c.children} />}
        <Row label="晤談方式" value={MEETING_LABEL[c.meetingType ?? ""] ?? c.meetingType} />
        {(c.issues?.length ?? 0) > 0 && (
          <View style={[S.row, { marginTop: 2 }]}>
            <Text style={S.label}>遇到的狀況</Text>
            <View style={[S.tagRow, { flex: 1 }]}>
              {(c.issues ?? []).map((i) => (
                <Text key={i} style={S.tag}>{i}</Text>
              ))}
            </View>
          </View>
        )}
      </View>
    </>
  );
}

function OtherContent({ data }: { data: InquiryPDFData }) {
  const o = data.otherDetails;
  if (!o) return null;
  return (
    <View style={S.section}>
      <SectionTitle>機構與合作資料</SectionTitle>
      <Row label="機構名稱" value={o.companyName} />
      <Row label="聯絡人" value={o.contactPerson} />
      {o.theme && <Row label="項目主題" value={o.theme} />}
    </View>
  );
}

function InquiryDocument({ data }: { data: InquiryPDFData }) {
  const serviceLabel = SERVICE_LABEL[data.serviceType] ?? data.serviceType;
  const submittedAt = new Date(data.submittedAt).toLocaleString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Taipei",
  });

  const displayName =
    data.serviceType === "couple"
      ? `${data.coupleDetails?.partnerA?.name ?? ""} & ${data.coupleDetails?.partnerB?.name ?? ""}`
      : data.serviceType !== "individual" && data.serviceType !== "hoarding"
      ? (data.otherDetails?.companyName ?? data.name ?? "")
      : (data.name ?? "");

  const concernLabel =
    data.serviceType === "couple" ? "目前遇到的狀況" : "求助內容";

  return (
    <Document title={`預約申請 - ${displayName}`}>
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.header}>
          <Text style={S.title}>預約申請資料表</Text>
          <Text style={S.subtitle}>
            樹心理工作室  ·  {serviceLabel}  ·  {submittedAt}
          </Text>
        </View>

        {/* Preferred times */}
        {data.preferredTimes && (
          <View style={S.section}>
            <SectionTitle>可行時段</SectionTitle>
            <Text style={{ color: "#555", lineHeight: 1.6, fontSize: 10 }}>
              {data.preferredTimes}
            </Text>
          </View>
        )}

        {/* Type-specific content */}
        {(data.serviceType === "individual" || data.serviceType === "hoarding") && (
          <IndividualContent data={data} />
        )}
        {data.serviceType === "couple" && <CoupleContent data={data} />}
        {data.serviceType !== "individual" &&
          data.serviceType !== "hoarding" &&
          data.serviceType !== "couple" && <OtherContent data={data} />}

        {/* Concern */}
        {data.concern && (
          <View style={S.section}>
            <SectionTitle>{concernLabel}</SectionTitle>
            <Text style={S.concernBox}>{data.concern}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={S.footer}>
          此文件由樹心理工作室系統自動生成，僅供內部評估使用。個案聯絡方式請查閱後台管理系統。
        </Text>
      </Page>
    </Document>
  );
}

export async function generateInquiryPDF(data: InquiryPDFData): Promise<Buffer> {
  return renderToBuffer(<InquiryDocument data={data} />);
}
