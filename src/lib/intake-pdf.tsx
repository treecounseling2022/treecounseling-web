import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "NotoSansTC",
  // jsDelivr mirrors @fontsource — full Traditional Chinese character set
  src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-tc@5/files/noto-sans-tc-chinese-traditional-400-normal.woff2",
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansTC",
    fontSize: 10,
    color: "#1a1a1a",
    padding: 48,
    lineHeight: 1.6,
  },
  header: {
    borderBottom: "1.5 solid #2d4a38",
    paddingBottom: 12,
    marginBottom: 20,
  },
  studioName: { fontSize: 8, color: "#7a9a80", letterSpacing: 2, marginBottom: 4 },
  docTitle: { fontSize: 18, color: "#2d4a38", fontWeight: "bold" },
  meta: { fontSize: 8, color: "#888", marginTop: 4 },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 8,
    color: "#7a9a80",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    borderBottom: "0.5 solid #d4c9b0",
    paddingBottom: 4,
    marginBottom: 10,
  },
  row: { flexDirection: "row", marginBottom: 5 },
  label: { width: 100, fontSize: 9, color: "#666" },
  value: { flex: 1, fontSize: 9, color: "#1a1a1a" },
  summaryBox: {
    backgroundColor: "#f7f5ef",
    borderLeft: "3 solid #5a8a6a",
    padding: 12,
    marginTop: 6,
  },
  summaryText: { fontSize: 9, color: "#333", lineHeight: 1.8 },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    borderTop: "0.5 solid #d4c9b0",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: "#aaa" },
});

interface Appointment {
  scheduled_at: string | null;
  booking_status: string;
  session_fee: number | null;
  currency: string;
  therapist_name: string | null;
}

interface ClientPDFProps {
  clientName: string;
  clientCode?: string | null;
  dob?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  serviceType?: string | null;
  appointments: Appointment[];
  intakeSummary?: string | null;
  intakeSubmittedAt?: string | null;
  generatedAt: string;
}

const GENDER_MAP: Record<string, string> = {
  male: "男", female: "女", other: "其他", prefer_not_to_say: "不透露",
};

const STATUS_MAP: Record<string, string> = {
  pending_admin: "待排案", pending_therapist: "待確認",
  confirmed: "已確認", locked: "鎖定", cancelled: "已取消",
};

const SERVICE_MAP: Record<string, string> = {
  individual: "個人心理輔導", couple: "伴侶心理輔導",
  hoarding: "囤積者諮商", workshop: "講座工作坊",
  proposal: "方案撰寫", other: "其他",
};

export function ClientIntakePDF({
  clientName, clientCode, dob, gender, phone, email, serviceType,
  appointments, intakeSummary, intakeSubmittedAt, generatedAt,
}: ClientPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.studioName}>TREE COUNSELING STUDIO</Text>
          <Text style={styles.docTitle}>{clientName} — 個案資料</Text>
          <Text style={styles.meta}>產生時間：{generatedAt}</Text>
        </View>

        {/* 基本資料 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>個案基本資料</Text>
          {clientCode && <Row label="個案編號" value={clientCode} />}
          <Row label="姓名" value={clientName} />
          <Row label="服務類型" value={serviceType ? (SERVICE_MAP[serviceType] ?? serviceType) : "—"} />
          <Row label="出生日期" value={dob ?? "—"} />
          <Row label="性別" value={gender ? (GENDER_MAP[gender] ?? gender) : "—"} />
          <Row label="電話" value={phone ?? "—"} />
          <Row label="電郵" value={email ?? "—"} />
        </View>

        {/* 預約記錄 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>預約記錄</Text>
          {appointments.length === 0 ? (
            <Text style={{ fontSize: 9, color: "#aaa" }}>尚無預約記錄</Text>
          ) : (
            appointments.map((a, i) => (
              <View key={i} style={styles.row}>
                <Text style={{ ...styles.label, width: 140 }}>
                  {a.scheduled_at
                    ? new Date(a.scheduled_at).toLocaleString("zh-TW", {
                        year: "numeric", month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })
                    : "（時間待定）"}
                </Text>
                <Text style={{ flex: 1, fontSize: 9 }}>
                  {STATUS_MAP[a.booking_status] ?? a.booking_status}
                  {a.therapist_name ? `  ·  ${a.therapist_name}` : ""}
                  {a.session_fee ? `  ·  ${a.currency} ${a.session_fee}` : ""}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* 初談摘要 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            AI 初談摘要{intakeSubmittedAt ? `（填寫於 ${new Date(intakeSubmittedAt).toLocaleDateString("zh-TW")}）` : "（未填寫）"}
          </Text>
          {intakeSummary ? (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>{intakeSummary}</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 9, color: "#aaa" }}>個案尚未完成初談問卷。</Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>樹心理工作室  Tree Counseling Studio</Text>
          <Text style={styles.footerText}>本文件屬機密，僅供心理師及行政人員閱覽</Text>
        </View>
      </Page>
    </Document>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}
