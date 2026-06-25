import React from "react";
import path from "path";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";

Font.register({
  family: "NotoSansSC",
  fonts: [
    { src: path.join(process.cwd(), "public/fonts/NotoSansSC-Regular.ttf"), fontWeight: "normal" },
    { src: path.join(process.cwd(), "public/fonts/NotoSansSC-Regular.ttf"), fontWeight: "bold" },
  ],
});

const S = StyleSheet.create({
  page: {
    fontFamily: "NotoSansSC",
    padding: "44 52 60 52",
    fontSize: 12,
    color: "#111",
    lineHeight: 1.7,
    backgroundColor: "#ffffff",
  },
  header: {
    borderBottom: "2pt solid #111",
    paddingBottom: 10,
    marginBottom: 20,
  },
  title: { fontSize: 18, color: "#000", fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 10.5, color: "#444" },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 11,
    color: "#000",
    fontWeight: "bold",
    letterSpacing: 0.5,
    marginBottom: 8,
    borderBottom: "1pt solid #bbb",
    paddingBottom: 4,
  },
  row: { flexDirection: "row", marginBottom: 6 },
  label: { width: 100, color: "#444", fontSize: 11 },
  value: { flex: 1, color: "#111", fontSize: 11 },
  valueBold: { flex: 1, color: "#000", fontWeight: "bold", fontSize: 11 },
  concernBox: {
    backgroundColor: "#f5f5f5",
    padding: "12 14",
    borderLeft: "3pt solid #555",
    marginTop: 4,
    lineHeight: 1.85,
    fontSize: 11,
  },
  partnerBox: {
    border: "1pt solid #bbb",
    padding: "12 14",
    marginBottom: 10,
  },
  partnerTitle: { fontSize: 11.5, color: "#000", fontWeight: "bold", marginBottom: 7 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 2 },
  tag: {
    backgroundColor: "#e8e8e8",
    color: "#111",
    fontSize: 10.5,
    padding: "3 7",
    marginRight: 5,
    marginBottom: 5,
  },
  tagSub: {
    backgroundColor: "#f0f0f0",
    color: "#333",
    fontSize: 10,
    padding: "2 6",
    marginRight: 4,
    marginBottom: 4,
    border: "0.5pt solid #ccc",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 52,
    right: 52,
    borderTop: "0.5pt solid #ccc",
    paddingTop: 6,
    color: "#888",
    fontSize: 9,
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

const MAIN_CATEGORY_LABEL: Record<string, string> = {
  addiction: "成癮問題",
  self_explore: "自我探索",
  family: "家庭關係",
  couple_rel: "伴侶關係",
  parenting: "親子關係",
  work_press: "工作壓力",
  academic: "學業 / 生涯",
  interpersonal: "人際關係",
  emotion: "情緒困擾",
  other_issue: "其他困擾",
};

const DAY_ORDER = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];

function groupPreferredTimes(raw: string): Array<{ day: string; slots: string[] }> {
  const parts = raw.split(/[、,]\s*/);
  const grouped = new Map<string, string[]>();
  for (const part of parts) {
    const match = part.trim().match(/^(星期[一二三四五六日])\s+(.+)$/);
    if (match) {
      const day = match[1];
      const slot = match[2];
      if (!grouped.has(day)) grouped.set(day, []);
      grouped.get(day)!.push(slot);
    }
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
    .map(([day, slots]) => ({ day, slots }));
}

function calcAgeStr(dob?: string): string | null {
  if (!dob) return null;
  try {
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? `${dob}（${age} 歲）` : dob;
  } catch {
    return dob ?? null;
  }
}

export type InquiryPDFData = {
  serviceType: string;
  preferredTimes?: string;
  submittedAt: string;
  name?: string;
  gender?: string;
  birthday?: string;
  city?: string;
  meetingType?: string;
  nativeLanguage?: string;
  preferredTherapist?: string;
  devices?: string[];
  concern?: string;
  individualDetails?: {
    mainCategories?: string[];
    subCategories?: string[];
    behaviorFrequency?: string;
    behaviorImpact?: string[];
    otherIssueText?: string;
    hasPsychiatryExp?: string;
    psychiatryDetails?: string;
    hasCounselingExp?: string;
    counselingDetails?: string;
    therapistRequirements?: string;
  };
  coupleDetails?: {
    partnerA?: { name?: string; gender?: string; birthday?: string; language?: string };
    partnerB?: { name?: string; gender?: string; birthday?: string; language?: string };
    issues?: string[];
    duration?: string;
    children?: string;
    meetingType?: string;
  };
  otherDetails?: {
    companyName?: string;
    contactPerson?: string;
    theme?: string;
  };
};

function Row({ label, value, bold }: { label: string; value?: string | null; bold?: boolean }) {
  if (!value) return null;
  return (
    <View style={S.row}>
      <Text style={S.label}>{label}</Text>
      <Text style={bold ? S.valueBold : S.value}>{value}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={S.sectionTitle}>{children.toUpperCase()}</Text>;
}

function IndividualContent({ data }: { data: InquiryPDFData }) {
  const d = data.individualDetails;
  const mainCats = (d?.mainCategories ?? []).map(
    (id) => MAIN_CATEGORY_LABEL[id] ?? id
  );
  const subCats = d?.subCategories ?? [];

  return (
    <>
      <View style={S.section}>
        <SectionTitle>個人基本資料</SectionTitle>
        <Row label="姓名" value={data.name} bold />
        <Row label="性別" value={GENDER_LABEL[data.gender ?? ""] ?? data.gender} />
        <Row label="出生日期" value={calcAgeStr(data.birthday)} />
        <Row label="居住城市" value={data.city} />
        <Row label="晤談方式" value={MEETING_LABEL[data.meetingType ?? ""] ?? data.meetingType} />
        <Row label="母語" value={LANG_LABEL[data.nativeLanguage ?? ""] ?? data.nativeLanguage} />
        {(data.devices?.length ?? 0) > 0 && (
          <Row label="可用設備" value={(data.devices ?? []).join("、")} />
        )}
        {data.preferredTherapist && (
          <Row label="偏好心理輔導人員" value={data.preferredTherapist} />
        )}
      </View>

      {mainCats.length > 0 && (
        <View style={S.section}>
          <SectionTitle>困擾類型</SectionTitle>
          <View style={S.tagRow}>
            {mainCats.map((c) => (
              <Text key={c} style={S.tag}>{c}</Text>
            ))}
          </View>
          {subCats.length > 0 && (
            <View style={[S.tagRow, { marginTop: 5 }]}>
              {subCats.map((s) => (
                <Text key={s} style={S.tagSub}>{s}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {d && (d.behaviorFrequency || (d.behaviorImpact?.length ?? 0) > 0 || d.otherIssueText) && (
        <View style={S.section}>
          <SectionTitle>困擾補充說明</SectionTitle>
          {d.behaviorFrequency && <Row label="成癮行為頻率" value={d.behaviorFrequency} />}
          {(d.behaviorImpact?.length ?? 0) > 0 && (
            <Row label="成癮影響面向" value={(d.behaviorImpact ?? []).join("、")} />
          )}
          {d.otherIssueText && <Row label="其他困擾說明" value={d.otherIssueText} />}
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
          <Text style={S.partnerTitle}>伴侶 A</Text>
          <Row label="姓名" value={c.partnerA?.name} bold />
          <Row label="性別" value={GENDER_LABEL[c.partnerA?.gender ?? ""] ?? c.partnerA?.gender} />
          <Row label="出生日期" value={calcAgeStr(c.partnerA?.birthday)} />
          <Row label="母語" value={LANG_LABEL[c.partnerA?.language ?? ""] ?? c.partnerA?.language} />
        </View>
        <View style={S.partnerBox}>
          <Text style={S.partnerTitle}>伴侶 B</Text>
          <Row label="姓名" value={c.partnerB?.name} bold />
          <Row label="性別" value={GENDER_LABEL[c.partnerB?.gender ?? ""] ?? c.partnerB?.gender} />
          <Row label="出生日期" value={calcAgeStr(c.partnerB?.birthday)} />
          <Row label="母語" value={LANG_LABEL[c.partnerB?.language ?? ""] ?? c.partnerB?.language} />
        </View>
      </View>

      <View style={S.section}>
        <SectionTitle>關係狀況</SectionTitle>
        <Row label="關係時長" value={c.duration} />
        {c.children && <Row label="子女" value={c.children} />}
        <Row label="晤談方式" value={MEETING_LABEL[c.meetingType ?? ""] ?? c.meetingType} />
        {(c.issues?.length ?? 0) > 0 && (
          <View style={[S.row, { marginTop: 3 }]}>
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
      <Row label="機構名稱" value={o.companyName} bold />
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
        <View style={S.header}>
          <Text style={S.title}>預約申請資料表</Text>
          <Text style={S.subtitle}>
            樹心理工作室  ·  {serviceLabel}  ·  {submittedAt}
          </Text>
        </View>

        {data.preferredTimes && (
          <View style={S.section}>
            <SectionTitle>可行時段</SectionTitle>
            {(() => {
              const groups = groupPreferredTimes(data.preferredTimes!);
              if (groups.length === 0) {
                return <Text style={{ color: "#333", lineHeight: 1.7, fontSize: 10 }}>{data.preferredTimes}</Text>;
              }
              return (
                <View>
                  {groups.map(({ day, slots }) => (
                    <View key={day} style={{ flexDirection: "row", marginBottom: 4 }}>
                      <Text style={{ width: 50, color: "#444", fontSize: 10, fontWeight: "bold" }}>{day}</Text>
                      <Text style={{ flex: 1, color: "#111", fontSize: 10 }}>{slots.join("、")}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>
        )}

        {(data.serviceType === "individual" || data.serviceType === "hoarding") && (
          <IndividualContent data={data} />
        )}
        {data.serviceType === "couple" && <CoupleContent data={data} />}
        {data.serviceType !== "individual" &&
          data.serviceType !== "hoarding" &&
          data.serviceType !== "couple" && <OtherContent data={data} />}

        {data.concern && (
          <View style={S.section}>
            <SectionTitle>{concernLabel}</SectionTitle>
            <Text style={S.concernBox}>{data.concern}</Text>
          </View>
        )}

        <Text fixed style={S.footer}>
          此文件由樹心理工作室系統自動生成，僅供內部評估使用。個案聯絡方式請查閱後台管理系統。
        </Text>
      </Page>
    </Document>
  );
}

export async function generateInquiryPDF(data: InquiryPDFData): Promise<Buffer> {
  return renderToBuffer(<InquiryDocument data={data} />);
}
