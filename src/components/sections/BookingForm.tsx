"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import AIConcernHelper from "@/components/ui/AIConcernHelper";
import SignatureCanvas from "@/components/ui/SignatureCanvas";

type TherapistOption = { id: string; name: string; title: string | null };

// 個人輔導十大困擾及其細項
const INDIVIDUAL_ISSUES = [
  {
    id: "addiction",
    label: "成癮問題",
    subIssues: [
      "酒精成癮 (飲酒失控、戒酒困難)",
      "藥物成癮 (非法藥物、處方藥依賴)",
      "網路/手機成癮 (過度使用、影響生活)",
      "購物成癮 (過度消費、無法自控)",
      "性成癮 (過度性行為、色情依賴)",
      "賭博成癮",
      "其他",
    ],
  },
  {
    id: "self_explore",
    label: "自我探索",
    subIssues: [
      "自我認同 (價值、目標、人生方向)",
      "性格特質探索",
      "性別認同 / 性傾向",
      "信仰 / 信念困擾",
      "興趣與長處發掘",
      "人生價值意義探尋",
      "自我批判 / 自我接納議題",
      "其他",
    ],
  },
  {
    id: "family",
    label: "家庭關係",
    subIssues: [
      "與父母衝突或疏離",
      "與兄弟姊妹爭執或競爭",
      "家庭溝通困難",
      "家庭界線模糊 / 互動壓力",
      "原生家庭創傷或影響",
      "家庭成員疾病 / 失落壓力",
      "其他",
    ],
  },
  {
    id: "couple_rel",
    label: "伴侶關係",
    subIssues: [
      "溝通模式困擾",
      "信任 / 忠誠 / 背叛",
      "伴侶間價值 / 目標落差",
      "感情冷淡 / 疏離感",
      "性生活 / 親密困擾",
      "受暴 / 控制或依賴關係",
      "分手 / 離婚調適",
      "其他",
    ],
  },
  {
    id: "parenting",
    label: "親子關係",
    subIssues: [
      "與子女溝通困難",
      "親子衝突與規範爭議",
      "教養壓力 / 育兒困擾",
      "子女行為 / 發展問題",
      "距離 (遠距家庭、親子疏離)",
      "特殊需求 (身心障礙、適應特殊情形)",
      "其他",
    ],
  },
  {
    id: "work_press",
    label: "工作壓力",
    subIssues: [
      "職場人際衝突",
      "工作負荷過重 / 疲勞",
      "工作動力低落",
      "工作倦怠 / 厭倦",
      "職位 / 職稱調整困擾",
      "失業 / 就業困難",
      "職場霸凌 / 歧視",
      "其他",
    ],
  },
  {
    id: "academic",
    label: "學業 / 生涯",
    subIssues: [
      "學習動機低落",
      "考試 / 升學焦慮",
      "成績壓力 / 退步",
      "生涯規劃迷惘",
      "將來職涯方向不明 / 轉換",
      "家長 / 他人期待壓力",
      "校園人際議題",
      "其他",
    ],
  },
  {
    id: "interpersonal",
    label: "人際關係",
    subIssues: [
      "社交焦慮 / 害怕被拒絕",
      "朋友疏離 / 被排擠",
      "隱私或界線困難",
      "難以建立深度連結",
      "被批評 / 誤解困擾",
      "團體適應困難",
      "社交技巧困難",
      "其他",
    ],
  },
  {
    id: "emotion",
    label: "情緒困擾",
    subIssues: [
      "長期憂鬱 / 低落感",
      "容易緊張 / 焦慮不安",
      "易怒 / 衝動情緒",
      "情緒波動大",
      "壓力難以排解",
      "無明原因的哭泣 / 空虛感",
      "其他",
    ],
  },
  {
    id: "other_issue",
    label: "其他困擾",
    subIssues: [],
  },
];

// 伴侶輔導狀況
const COUPLE_ISSUES = [
  "外遇",
  "管教子女",
  "經濟議題",
  "溝通不良",
  "婆媳關係",
  "婚前輔導",
  "親密議題",
  "生育議題",
  "其他",
];

const DEVICE_OPTIONS = ["智能手機", "平板電腦", "桌上型電腦", "其他"];
const DAYS_OF_WEEK = ["一", "二", "三", "四", "五", "六", "日"];
const TIME_SLOTS = [
  "9:00-9:50",
  "10:00-10:50",
  "11:00-11:50",
  "12:00-12:50",
  "13:00-13:50",
  "14:00-14:50",
  "15:00-15:50",
  "16:00-16:50",
  "17:00-17:50",
  "18:00-18:50",
  "19:00-19:50",
  "20:00-20:50",
  "21:00-21:50",
  "22:00-22:50",
  "23:00-23:50",
];

// 伴侶晤談限定時段
const COUPLE_TIME_SLOTS = [
  "星期一 19:00-22:00",
  "星期二 19:00-22:00",
  "星期三 19:00-22:00",
  "星期四 19:00-22:00",
  "星期五 19:00-22:00",
  "星期六 09:00-12:00",
  "星期六 12:00-18:00",
  "星期六 18:00-22:00",
  "星期日 09:00-12:00",
  "星期日 12:00-18:00",
  "星期日 18:00-22:00",
];

type SubmitState = "idle" | "loading" | "success" | "error";

export default function BookingForm({ therapists = [] }: { therapists?: TherapistOption[] }) {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ================= STATE DEFINITIONS =================
  
  // 選擇服務類型，預設為空字串，強制讓使用者先點選
  const [serviceType, setServiceType] = useState<string>("");

  // 步驟二：A - 個人心理輔導 / 囤積者查詢
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [birthday, setBirthday] = useState("");
  const [city, setCity] = useState("");
  const [contactType, setContactType] = useState("whatsapp");
  const [contactId, setContactId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [meetingType, setMeetingType] = useState("face");
  const [nativeLanguage, setNativeLanguage] = useState("cantonese");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [preferredTherapist, setPreferredTherapist] = useState("");
  const [selectedMainIssues, setSelectedMainIssues] = useState<string[]>([]);
  const [selectedSubIssues, setSelectedSubIssues] = useState<string[]>([]);
  const [behaviorFrequency, setBehaviorFrequency] = useState("");
  const [behaviorImpact, setBehaviorImpact] = useState<string[]>([]);
  const [hasPsychiatryExp, setHasPsychiatryExp] = useState("");
  const [psychiatryDetails, setPsychiatryDetails] = useState("");
  const [hasCounselingExp, setHasCounselingExp] = useState("");
  const [counselingDetails, setCounselingDetails] = useState("");
  const [concern, setConcern] = useState("");
  const [therapistRequirements, setTherapistRequirements] = useState("");
  const [otherIssueText, setOtherIssueText] = useState("");

  // 步驟二：B - 伴侶心理輔導
  const [nameA, setNameA] = useState("");
  const [genderA, setGenderA] = useState("");
  const [birthdayA, setBirthdayA] = useState("");
  const [languageA, setLanguageA] = useState("cantonese");
  const [nameB, setNameB] = useState("");
  const [genderB, setGenderB] = useState("");
  const [birthdayB, setBirthdayB] = useState("");
  const [languageB, setLanguageB] = useState("cantonese");
  const [coupleIssues, setCoupleIssues] = useState<string[]>([]);
  const [relationshipDuration, setRelationshipDuration] = useState("");
  const [childrenCount, setChildrenCount] = useState("");
  const [coupleConcern, setCoupleConcern] = useState("");
  const [meetingTypeCouple, setMeetingTypeCouple] = useState("face");
  const [contactTypeCouple, setContactTypeCouple] = useState("whatsapp");
  const [contactIdA, setContactIdA] = useState("");
  const [contactIdB, setContactIdB] = useState("");
  const [emailA, setEmailA] = useState("");
  const [emailB, setEmailB] = useState("");
  const [phoneA, setPhoneA] = useState("");
  const [phoneB, setPhoneB] = useState("");

  // 步驟二：C - 講座工作坊 / 方案計劃 / 其他
  const [companyName, setCompanyName] = useState(""); // 單位名稱
  const [contactPerson, setContactPerson] = useState(""); // 聯絡人姓名
  const [contactTypeOther, setContactTypeOther] = useState("whatsapp");
  const [contactIdOther, setContactIdOther] = useState("");
  const [emailOther, setEmailOther] = useState("");
  const [phoneOther, setPhoneOther] = useState("");
  const [projectTheme, setProjectTheme] = useState(""); // 需求主題
  const [otherConcern, setOtherConcern] = useState(""); // 詳細需求說明

  // 步驟三：時間與簽名
  const [selectedTimesGrid, setSelectedTimesGrid] = useState<Record<string, boolean>>({});
  const [selectedCoupleTimes, setSelectedCoupleTimes] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  // 出生日期最大值：18 歲前（不服務 18 歲以下）
  const maxBirthdate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().slice(0, 10);
  })();

  // ================= MUTATORS =================

  const toggleDevice = (dev: string) => {
    setSelectedDevices((prev) =>
      prev.includes(dev) ? prev.filter((d) => d !== dev) : [...prev, dev]
    );
  };

  const toggleMainIssue = (issueId: string) => {
    setSelectedMainIssues((prev) =>
      prev.includes(issueId) ? prev.filter((id) => id !== issueId) : [...prev, issueId]
    );
  };

  const toggleSubIssue = (subIssue: string) => {
    setSelectedSubIssues((prev) =>
      prev.includes(subIssue) ? prev.filter((s) => s !== subIssue) : [...prev, subIssue]
    );
  };

  const toggleCoupleIssue = (issue: string) => {
    setCoupleIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    );
  };

  const toggleTimeGrid = (day: string, slot: string) => {
    const key = `${day}-${slot}`;
    setSelectedTimesGrid((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleCoupleTime = (time: string) => {
    setSelectedCoupleTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const handleBack = () => {
    setFormErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ================= VALIDATION LOGIC =================

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  // 驗證整份表單
  const validateForm = () => {
    const errs: Record<string, string> = {};

    // 1. 驗證是否選擇服務類型
    if (!serviceType) {
      errs.serviceType = "請選擇一項服務類型";
      setFormErrors(errs);
      return false;
    }

    // 2. 根據服務類型驗證背景資料與時間選擇
    if (serviceType === "individual" || serviceType === "hoarding") {
      // 個人輔導 / 囤積者查詢
      if (!name.trim()) errs.name = "請輸入姓名";
      if (!gender) errs.gender = "請選擇性別";
      if (!birthday) {
        errs.birthday = "請選擇出生日期";
      } else {
        const year = birthday.split("-")[0];
        if (year.length !== 4) {
          errs.birthday = "年份必須為 4 位數";
        } else if (birthday > maxBirthdate) {
          errs.birthday = "申請人須年滿 18 歲，工作室暫不服務未成年人士";
        }
      }
      if (!contactId.trim()) errs.contactId = "請輸入聯絡帳號/ID";
      if (!isValidEmail(email)) errs.email = "請輸入有效的電郵地址";
      if (!phone.trim()) errs.phone = "請輸入手機號碼";
      if (serviceType === "individual" && selectedMainIssues.length === 0) {
        errs.mainIssues = "請至少選擇一項困擾類型";
      }
      if (!hasPsychiatryExp) errs.hasPsychiatryExp = "請選擇是否曾有精神科就診經驗";
      if (hasPsychiatryExp === "yes" && !psychiatryDetails.trim()) {
        errs.psychiatryDetails = "請說明就診與診斷用藥狀況";
      }
      if (!hasCounselingExp) errs.hasCounselingExp = "請選擇是否曾有接受心理輔導經驗";
      if (hasCounselingExp === "yes" && !counselingDetails.trim()) {
        errs.counselingDetails = "請說明過往輔導或諮商狀況";
      }
      if (!concern.trim()) errs.concern = "請簡述您目前遇到的困擾";

      const selectedCount = Object.values(selectedTimesGrid).filter(Boolean).length;
      if (selectedCount < 3) {
        errs.times = `您目前選擇了 ${selectedCount} 個時段，請至少選擇 3 個可行的時段。`;
      }

    } else if (serviceType === "couple") {
      // 伴侶心理輔導
      if (!nameA.trim()) errs.nameA = "[A] 姓名為必填";
      if (!genderA) errs.genderA = "[A] 性別為必填";
      if (!birthdayA) {
        errs.birthdayA = "[A] 生日為必填";
      } else {
        const year = birthdayA.split("-")[0];
        if (year.length !== 4) {
          errs.birthdayA = "[A] 年份必須為 4 位數";
        } else if (birthdayA > maxBirthdate) {
          errs.birthdayA = "[A] 申請人須年滿 18 歲";
        }
      }
      if (!nameB.trim()) errs.nameB = "[B] 姓名為必填";
      if (!genderB) errs.genderB = "[B] 性別為必填";
      if (!birthdayB) {
        errs.birthdayB = "[B] 生日為必填";
      } else {
        const year = birthdayB.split("-")[0];
        if (year.length !== 4) {
          errs.birthdayB = "[B] 年份必須為 4 位數";
        } else if (birthdayB > maxBirthdate) {
          errs.birthdayB = "[B] 申請人須年滿 18 歲";
        }
      }
      if (coupleIssues.length === 0) errs.coupleIssues = "請至少選擇一項遇到的狀況";
      if (!relationshipDuration.trim()) errs.relationshipDuration = "請填寫關係時長";
      if (!coupleConcern.trim()) errs.coupleConcern = "請填寫目前遇到的狀況";
      if (!contactIdA.trim()) errs.contactIdA = "[A] 聯絡帳號為必填";
      if (!contactIdB.trim()) errs.contactIdB = "[B] 聯絡帳號為必填";
      if (!isValidEmail(emailA)) errs.emailA = "[A] 電郵格式不正確";
      if (!isValidEmail(emailB)) errs.emailB = "[B] 電郵格式不正確";
      if (!phoneA.trim()) errs.phoneA = "[A] 手機為必填";
      if (!phoneB.trim()) errs.phoneB = "[B] 手機為必填";

      if (selectedCoupleTimes.length === 0) {
        errs.times = "請至少選擇一個可行的晤談時段。";
      }

    } else {
      // 講座 / 方案 / 其他（機構單位，無須性別與出生日期）
      if (!companyName.trim()) errs.companyName = "請填寫單位或機構名稱";
      if (!contactPerson.trim()) errs.contactPerson = "請填寫聯絡人姓名";
      if (!contactIdOther.trim()) errs.contactIdOther = "請填寫聯絡帳號";
      if (!isValidEmail(emailOther)) errs.emailOther = "請填寫有效的聯絡電郵";
      if (!phoneOther.trim()) errs.phoneOther = "請填寫聯絡電話";
      if (!otherConcern.trim()) errs.otherConcern = "請填寫需求細節說明";
    }

    // 3. 驗證簽名與同意書
    if (!signature) {
      errs.signature = "請在下方灰色區域簽名以完成預約。";
    }

    if (!consent) {
      errs.consent = "您必須勾選並同意知情保密協議。";
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ================= FORM SUBMISSION =================

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      // 滾動到第一個出錯的欄位
      setTimeout(() => {
        const errorEl = document.querySelector(".text-red-500");
        if (errorEl) {
          errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return;
    }

    setSubmitState("loading");

    // 時間格式化
    let formattedTimes = "";
    if (serviceType === "individual" || serviceType === "hoarding") {
      const dayOrder = ["一", "二", "三", "四", "五", "六", "日"];
      formattedTimes = Object.keys(selectedTimesGrid)
        .filter((key) => selectedTimesGrid[key])
        .sort((a, b) => {
          const dayA = a.charAt(0);
          const dayB = b.charAt(0);
          const slotA = a.slice(2);
          const slotB = b.slice(2);
          const dayDiff = dayOrder.indexOf(dayA) - dayOrder.indexOf(dayB);
          if (dayDiff !== 0) return dayDiff;
          return TIME_SLOTS.indexOf(slotA) - TIME_SLOTS.indexOf(slotB);
        })
        .map((key) => `星期${key.charAt(0)} ${key.slice(2)}`)
        .join("、");
    } else if (serviceType === "couple") {
      formattedTimes = selectedCoupleTimes.join("、");
    } else {
      formattedTimes = "機構合作，時間由行政後續口頭對接安排";
    }

    // 依服務類型建置提交 payload
    const payload = {
      serviceType,
      preferredTimes: formattedTimes,
      signature,

      // 1. 個人心理輔導 / 囤積者查詢
      ...( (serviceType === "individual" || serviceType === "hoarding") ? {
        name,
        gender,
        birthday,
        city,
        contactType,
        contactId,
        email,
        phone,
        meetingType,
        nativeLanguage,
        devices: selectedDevices,
        preferredTherapist,
        concern,
        individualDetails: {
          mainCategories: selectedMainIssues,
          subCategories: selectedSubIssues,
          behaviorFrequency,
          behaviorImpact,
          hasPsychiatryExp,
          psychiatryDetails,
          hasCounselingExp,
          counselingDetails,
          therapistRequirements,
          otherIssueText: selectedMainIssues.includes("other_issue") ? otherIssueText : undefined,
        }
      } : {}),

      // 2. 伴侶心理輔導
      ...(serviceType === "couple" ? {
        name: `${nameA} & ${nameB}`, // 舊 API 相容
        email: emailA,
        phone: phoneA,
        concern: coupleConcern,
        coupleDetails: {
          partnerA: { name: nameA, gender: genderA, birthday: birthdayA, language: languageA, contactId: contactIdA, email: emailA, phone: phoneA },
          partnerB: { name: nameB, gender: genderB, birthday: birthdayB, language: languageB, contactId: contactIdB, email: emailB, phone: phoneB },
          issues: coupleIssues,
          duration: relationshipDuration,
          children: childrenCount,
          meetingType: meetingTypeCouple,
          contactType: contactTypeCouple,
        }
      } : {}),

      // 3. 講座、方案與其它合作
      ...( (serviceType !== "individual" && serviceType !== "couple" && serviceType !== "hoarding") ? {
        name: `${companyName} (${contactPerson})`,
        email: emailOther,
        phone: phoneOther,
        concern: otherConcern,
        otherDetails: {
          companyName,
          contactPerson,
          contactType: contactTypeOther,
          contactId: contactIdOther,
          theme: projectTheme,
        }
      } : {})
    };

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("預約提交失敗");

      setSubmitState("success");
    } catch (err) {
      console.error(err);
      setSubmitState("error");
    }
  };

  if (submitState === "success") {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    return (
      <div className="bg-forest/10 border border-sand/30 p-10 text-center font-sans max-w-2xl mx-auto my-12">
        <div className="w-14 h-14 border border-sand flex items-center justify-center mx-auto mb-6">
          <svg className="w-6 h-6 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-serif text-deep text-2xl mb-4">預約申請已送出</h3>
        <p className="text-muted text-sm leading-relaxed max-w-md mx-auto">
          我們已收到您的預約需求！
          行政人員收到申請後，將盡快於兩個工作日天內以 WhatsApp 或 Email 與您聯絡對接，確認後續晤談或項目合作安排。
        </p>
        <button
          onClick={() => {
            setSubmitState("idle");
            setServiceType("");
            // 清空所有欄位
            setName("");
            setGender("");
            setBirthday("");
            setCity("");
            setContactId("");
            setEmail("");
            setPhone("");
            setSelectedMainIssues([]);
            setSelectedSubIssues([]);
            setBehaviorFrequency("");
            setBehaviorImpact([]);
            setHasPsychiatryExp("");
            setPsychiatryDetails("");
            setHasCounselingExp("");
            setCounselingDetails("");
            setConcern("");
            setTherapistRequirements("");
            setOtherIssueText("");
            setNameA("");
            setGenderA("");
            setBirthdayA("");
            setNameB("");
            setGenderB("");
            setBirthdayB("");
            setCoupleIssues([]);
            setRelationshipDuration("");
            setChildrenCount("");
            setCoupleConcern("");
            setContactIdA("");
            setContactIdB("");
            setEmailA("");
            setEmailB("");
            setPhoneA("");
            setPhoneB("");
            setCompanyName("");
            setContactPerson("");
            setContactIdOther("");
            setEmailOther("");
            setPhoneOther("");
            setProjectTheme("");
            setOtherConcern("");
            setSelectedTimesGrid({});
            setSelectedCoupleTimes([]);
            setSignature(null);
            setConsent(false);
            setFormErrors({});
          }}
          className="mt-8 text-sm font-sans text-muted hover:text-forest border-b border-muted/30 hover:border-forest pb-px transition-all cursor-pointer"
        >
          填寫另一份預約單
        </button>
      </div>
    );
  }

  return (
    <div className="w-full font-sans text-deep">
      <form onSubmit={handleFormSubmit} noValidate className="space-y-8 bg-soft/40 border border-sand/15 p-6 md:p-10">
        
        {/* ================= 服務類型選擇 (始終顯示於頂部) ================= */}
        <div className="space-y-4">
          <Field label="您需要預約哪項服務？" required error={formErrors.serviceType}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {[
                { id: "individual", title: "個人心理輔導", desc: "自我探索、情緒困擾、人際壓力、工作/生涯等" },
                { id: "couple", title: "伴侶心理輔導", desc: "伴侶溝通困擾、關係疏離、親密議題等（Joyce提供）" },
                { id: "hoarding", title: "囤積者諮商查詢", desc: "斷捨離反思、環境與未整理情緒之輔導與諮商" },
                { id: "workshop", title: "講座和工作坊", desc: "機構、學校、企業客製化心理健康講座合作" },
                { id: "proposal", title: "方案與計劃撰寫", desc: "由專業執行角度為組織機構量身訂製計劃方案" },
                { id: "other", title: "其他行政查詢", desc: "其餘項目對接或特殊輔導安排查詢" },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={cn(
                    "flex flex-col p-5 border text-left cursor-pointer transition-all duration-300",
                    serviceType === opt.id
                      ? "bg-forest/10 border-forest shadow-xs animate-none"
                      : "border-sand/20 bg-paper/30 hover:border-sand/50"
                  )}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-serif text-sm font-semibold text-deep">{opt.title}</span>
                    <input
                      type="radio"
                      name="serviceTypeSelection"
                      value={opt.id}
                      checked={serviceType === opt.id}
                      onChange={() => {
                        setServiceType(opt.id);
                        setFormErrors({});
                      }}
                      className="w-4 h-4 accent-forest border-sand"
                    />
                  </div>
                  <span className="text-[11px] text-muted leading-relaxed">{opt.desc}</span>
                </label>
              ))}
            </div>
          </Field>
        </div>

        {/* ================= 根據所選服務動態顯示填寫內容 ================= */}
        {!serviceType ? (
          <div className="p-10 text-center border border-dashed border-sand/30 bg-paper/20 rounded-md">
            <p className="text-sm font-sans text-muted/60">
              請先於上方選擇您需要的服務類型，下方將自動為您展開對應的填寫表單。
            </p>
          </div>
        ) : (
          <div className="space-y-8 pt-8 border-t border-sand/15 transition-all duration-500">
            
            {/* ================= A: 個人心理輔導 / 囤積者查詢背景 ================= */}
            {(serviceType === "individual" || serviceType === "hoarding") && (
              <div className="space-y-6">
                <h3 className="font-serif text-lg font-medium text-forest border-b border-sand/20 pb-2">
                  個人基本資料與背景
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Field label="姓名" required error={formErrors.name}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="請輸入真實姓名"
                      className={inputClass(!!formErrors.name)}
                    />
                  </Field>

                  <Field label="性別" required error={formErrors.gender}>
                    <div className="flex gap-6 pt-3">
                      {["男", "女", "其他"].map((g) => (
                        <label key={g} className="flex items-center gap-2 cursor-pointer text-sm text-muted">
                          <input
                            type="radio"
                            name="gender"
                            value={g}
                            checked={gender === g}
                            onChange={() => setGender(g)}
                            className="w-4 h-4 border border-sand accent-forest"
                          />
                          {g}
                        </label>
                      ))}
                    </div>
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Field label="出生日期" required error={formErrors.birthday} hint="服務對象為 18 歲或以上">
                    <input
                      type="date"
                      min="1900-01-01"
                      max={maxBirthdate}
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className={inputClass(!!formErrors.birthday)}
                    />
                  </Field>

                  <Field label="居住城市" hint="例如：澳門">
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="居住城市"
                      className={inputClass(false)}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Field label="主要聯絡方式" required>
                    <div className="flex gap-6 pt-3">
                      {[
                        { val: "whatsapp", label: "WhatsApp (建議)" },
                        { val: "email", label: "Email" },
                      ].map((opt) => (
                        <label key={opt.val} className="flex items-center gap-2 cursor-pointer text-sm text-muted">
                          <input
                            type="radio"
                            name="contactType"
                            value={opt.val}
                            checked={contactType === opt.val}
                            onChange={() => setContactType(opt.val)}
                            className="w-4 h-4 border border-sand accent-forest"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </Field>

                  <Field label="聯絡帳號 / ID" required error={formErrors.contactId} hint="如為 WhatsApp 請填手機號，Email 請填電郵">
                    <input
                      type="text"
                      value={contactId}
                      onChange={(e) => setContactId(e.target.value)}
                      placeholder="聯絡帳號"
                      className={inputClass(!!formErrors.contactId)}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Field label="電郵地址" required error={formErrors.email}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className={inputClass(!!formErrors.email)}
                    />
                  </Field>

                  <Field label="手機號碼" required error={formErrors.phone}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="聯絡電話"
                      className={inputClass(!!formErrors.phone)}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Field label="期待晤談方式" required>
                    <div className="flex gap-6 pt-3">
                      {[
                        { val: "face", label: "面談" },
                        { val: "online", label: "網路晤談 (線上)" },
                      ].map((opt) => (
                        <label key={opt.val} className="flex items-center gap-2 cursor-pointer text-sm text-muted">
                          <input
                            type="radio"
                            name="meetingType"
                            value={opt.val}
                            checked={meetingType === opt.val}
                            onChange={() => setMeetingType(opt.val)}
                            className="w-4 h-4 border border-sand accent-forest"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </Field>

                  <Field label="母語" required>
                    <select
                      value={nativeLanguage}
                      onChange={(e) => setNativeLanguage(e.target.value)}
                      className={cn(inputClass(false), "cursor-pointer")}
                    >
                      <option value="cantonese">粵語</option>
                      <option value="mandarin">普通話 / 國語</option>
                      <option value="english">英語</option>
                      <option value="other">其他</option>
                    </select>
                  </Field>
                </div>

                <Field label="可使用的視訊設備 (線上晤談用，可多選)">
                  <div className="flex flex-wrap gap-5 pt-2">
                    {DEVICE_OPTIONS.map((dev) => (
                      <label key={dev} className="flex items-center gap-2 cursor-pointer text-sm text-muted">
                        <input
                          type="checkbox"
                          checked={selectedDevices.includes(dev)}
                          onChange={() => toggleDevice(dev)}
                          className="w-4 h-4 border border-sand accent-forest"
                        />
                        {dev}
                      </label>
                    ))}
                  </div>
                </Field>

                <Field label="偏好心理輔導人員（選填）">
                  <select
                    value={preferredTherapist}
                    onChange={(e) => setPreferredTherapist(e.target.value)}
                    className={cn(inputClass(false), "cursor-pointer w-full max-w-sm")}
                  >
                    <option value="">由工作室為您配對合適心理輔導人員</option>
                    {therapists.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}{member.title ? `（${member.title}）` : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* 個人心理輔導的困擾選擇，囤積者查詢只顯示囤積主旨 */}
                {serviceType === "individual" && (
                  <div className="space-y-6 pt-4 border-t border-sand/15">
                    <Field label="您的困擾類型 (多選)" required error={formErrors.mainIssues}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
                        {INDIVIDUAL_ISSUES.map((issue) => (
                          <label
                            key={issue.id}
                            className={cn(
                              "flex items-center justify-center p-3 border text-xs text-center cursor-pointer transition-all duration-300",
                              selectedMainIssues.includes(issue.id)
                                ? "bg-forest/10 border-forest text-forest font-medium"
                                : "border-sand/30 bg-paper/30 hover:border-sand/65 text-muted"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={selectedMainIssues.includes(issue.id)}
                              onChange={() => toggleMainIssue(issue.id)}
                              className="sr-only"
                            />
                            {issue.label}
                          </label>
                        ))}
                      </div>
                    </Field>

                    {INDIVIDUAL_ISSUES.map((mainIssue) => {
                      if (!selectedMainIssues.includes(mainIssue.id)) return null;
                      // 「其他困擾」無細項，跳過，由下方困擾描述欄填寫
                      if (mainIssue.id === "other_issue") return null;

                      return (
                        <div key={mainIssue.id} className="p-4 bg-paper/50 border border-sand/15 space-y-3 transition-all">
                          <h4 className="font-serif text-xs font-semibold text-forest uppercase tracking-wider">
                            {mainIssue.label} 細項選填
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {mainIssue.subIssues.map((sub) => (
                              <label key={sub} className="flex items-start gap-2.5 cursor-pointer text-xs text-muted leading-relaxed">
                                <input
                                  type="checkbox"
                                  checked={selectedSubIssues.includes(sub)}
                                  onChange={() => toggleSubIssue(sub)}
                                  className="mt-0.5 w-3.5 h-3.5 border border-sand accent-forest"
                                />
                                {sub}
                              </label>
                            ))}
                          </div>

                          {/* 成癮問題行為頻率 */}
                          {mainIssue.id === "addiction" && (
                            <div className="pt-3 border-t border-sand/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[11px] text-deep mb-1 font-medium">成癮行為發生頻率 (近一個月)</label>
                                <select
                                  value={behaviorFrequency}
                                  onChange={(e) => setBehaviorFrequency(e.target.value)}
                                  className={cn(inputClass(false), "py-1.5 text-xs bg-paper")}
                                >
                                  <option value="">請選擇頻率</option>
                                  <option value="幾乎每天多次">幾乎每天多次</option>
                                  <option value="每天 1 次">每天 1 次</option>
                                  <option value="每週 3-5 次">每週 3-5 次</option>
                                  <option value="每週 1-2 次">每週 1-2 次</option>
                                  <option value="每月 1-3 次">每月 1-3 次</option>
                                  <option value="偶爾 (低於每月 1 次)">偶爾 (低於每月 1 次)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] text-deep mb-1 font-medium">成癮影響面向</label>
                                <div className="grid grid-cols-1 gap-1 text-[11px] text-muted">
                                  {["影響工作/學業", "影響人際/家庭", "經濟壓力", "健康惡化", "曾戒除失敗", "戒斷症狀", "其他"].map((item) => (
                                    <label key={item} className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={behaviorImpact.includes(item)}
                                        onChange={() =>
                                          setBehaviorImpact((prev) =>
                                            prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
                                          )
                                        }
                                        className="w-3.5 h-3.5 border border-sand accent-forest"
                                      />
                                      {item}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 精神科/就診史 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-sand/15">
                  <Field label="曾有精神科就診經驗" required error={formErrors.hasPsychiatryExp}>
                    <div className="flex gap-6 pt-2">
                      {[{ val: "yes", label: "有" }, { val: "no", label: "沒有" }].map((opt) => (
                        <label key={opt.val} className="flex items-center gap-2 cursor-pointer text-sm text-muted">
                          <input
                            type="radio"
                            name="hasPsychiatryExp"
                            value={opt.val}
                            checked={hasPsychiatryExp === opt.val}
                            onChange={() => setHasPsychiatryExp(opt.val)}
                            className="w-4 h-4 border border-sand accent-forest"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </Field>

                  {hasPsychiatryExp === "yes" && (
                    <Field label="請簡述狀況" required error={formErrors.psychiatryDetails} hint="內容儘量包含何時就診、是否有診斷、用藥情況等。">
                      <textarea
                        rows={3}
                        value={psychiatryDetails}
                        onChange={(e) => setPsychiatryDetails(e.target.value)}
                        placeholder="例如：2024年因焦慮就診，固定服用輕微安眠藥..."
                        className={cn(inputClass(!!formErrors.psychiatryDetails), "resize-none")}
                      />
                    </Field>
                  )}
                </div>

                {/* 諮商經歷 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-sand/15">
                  <Field label="曾有接受心理輔導或諮商經驗" required error={formErrors.hasCounselingExp}>
                    <div className="flex gap-6 pt-2">
                      {[{ val: "yes", label: "有" }, { val: "no", label: "沒有" }].map((opt) => (
                        <label key={opt.val} className="flex items-center gap-2 cursor-pointer text-sm text-muted">
                          <input
                            type="radio"
                            name="hasCounselingExp"
                            value={opt.val}
                            checked={hasCounselingExp === opt.val}
                            onChange={() => setHasCounselingExp(opt.val)}
                            className="w-4 h-4 border border-sand accent-forest"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </Field>

                  {hasCounselingExp === "yes" && (
                    <Field label="請簡述狀況" required error={formErrors.counselingDetails} hint="內容儘量包含何時接受輔導、持續時間、開始/結束原因。">
                      <textarea
                        rows={3}
                        value={counselingDetails}
                        onChange={(e) => setCounselingDetails(e.target.value)}
                        placeholder="例如：曾在大專輔導中心諮商約5次，因畢業結案..."
                        className={cn(inputClass(!!formErrors.counselingDetails), "resize-none")}
                      />
                    </Field>
                  )}
                </div>

                {/* 困擾詳細描述文字域 + AI 助手按鈕 */}
                <div className="pt-6 border-t border-sand/15 space-y-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <label className="block font-sans text-sm text-deep">
                      請簡述您目前遇到的困擾與狀態 <span className="text-sand ml-1">*</span>
                    </label>
                    <AIConcernHelper
                      serviceType={serviceType}
                      onComplete={(summary) => setConcern(summary)}
                    />
                  </div>
                  <textarea
                    rows={5}
                    value={concern}
                    onChange={(e) => setConcern(e.target.value)}
                    placeholder="請大致描述目前遇到的狀況，您也可以點擊上方按鈕，由 AI 溫和引導您回答以完成整理..."
                    className={cn(inputClass(!!formErrors.concern), "resize-none")}
                  />
                  {formErrors.concern && <p className="text-xs text-red-500 font-sans">{formErrors.concern}</p>}
                </div>

                {/* 輔導人員要求 */}
                <Field label="對於輔導人員的要求 (選填)" hint="如性別偏好、個人風格、流派等">
                  <input
                    type="text"
                    value={therapistRequirements}
                    onChange={(e) => setTherapistRequirements(e.target.value)}
                    placeholder="例如：希望找溫柔的女性心理輔導師"
                    className={inputClass(false)}
                  />
                </Field>
              </div>
            )}

            {/* ================= B: 伴侶心理輔導背景 ================= */}
            {serviceType === "couple" && (
              <div className="space-y-6">
                <h3 className="font-serif text-lg font-medium text-forest border-b border-sand/20 pb-2">
                  伴侶心理輔導雙方資料
                </h3>
                <p className="text-xs text-sand font-medium leading-relaxed">* 提示：伴侶輔導由 黃文靜 (Joyce) 心理輔導師 提供。</p>

                {/* 成員 A */}
                <div className="p-4 bg-paper/40 border border-sand/15 space-y-4">
                  <h4 className="font-serif text-sm font-semibold text-deep border-b border-sand/10 pb-1">
                    「A」先生 / 小姐 個人基本資料
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="姓名" required error={formErrors.nameA}>
                      <input
                        type="text"
                        value={nameA}
                        onChange={(e) => setNameA(e.target.value)}
                        placeholder="姓名 A"
                        className={inputClass(!!formErrors.nameA)}
                      />
                    </Field>
                    <Field label="性別" required error={formErrors.genderA}>
                      <select value={genderA} onChange={(e) => setGenderA(e.target.value)} className={cn(inputClass(!!formErrors.genderA), "cursor-pointer")}>
                        <option value="">選擇性別</option>
                        <option value="男">男</option>
                        <option value="女">女</option>
                        <option value="其他">其他</option>
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="出生日期" required error={formErrors.birthdayA} hint="18 歲或以上">
                      <input
                        type="date"
                        min="1900-01-01"
                        max={maxBirthdate}
                        value={birthdayA}
                        onChange={(e) => setBirthdayA(e.target.value)}
                        className={inputClass(!!formErrors.birthdayA)}
                      />
                    </Field>
                    <Field label="母語" required>
                      <select value={languageA} onChange={(e) => setLanguageA(e.target.value)} className={cn(inputClass(false), "cursor-pointer")}>
                        <option value="cantonese">粵語</option>
                        <option value="mandarin">普通話 / 國語</option>
                        <option value="english">英語</option>
                        <option value="other">其他</option>
                      </select>
                    </Field>
                  </div>
                </div>

                {/* 成員 B */}
                <div className="p-4 bg-paper/40 border border-sand/15 space-y-4">
                  <h4 className="font-serif text-sm font-semibold text-deep border-b border-sand/10 pb-1">
                    「B」先生 / 小姐 個人基本資料
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="姓名" required error={formErrors.nameB}>
                      <input
                        type="text"
                        value={nameB}
                        onChange={(e) => setNameB(e.target.value)}
                        placeholder="姓名 B"
                        className={inputClass(!!formErrors.nameB)}
                      />
                    </Field>
                    <Field label="性別" required error={formErrors.genderB}>
                      <select value={genderB} onChange={(e) => setGenderB(e.target.value)} className={cn(inputClass(!!formErrors.genderB), "cursor-pointer")}>
                        <option value="">選擇性別</option>
                        <option value="男">男</option>
                        <option value="女">女</option>
                        <option value="其他">其他</option>
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="出生日期" required error={formErrors.birthdayB} hint="18 歲或以上">
                      <input
                        type="date"
                        min="1900-01-01"
                        max={maxBirthdate}
                        value={birthdayB}
                        onChange={(e) => setBirthdayB(e.target.value)}
                        className={inputClass(!!formErrors.birthdayB)}
                      />
                    </Field>
                    <Field label="母語" required>
                      <select value={languageB} onChange={(e) => setLanguageB(e.target.value)} className={cn(inputClass(false), "cursor-pointer")}>
                        <option value="cantonese">粵語</option>
                        <option value="mandarin">普通話 / 國語</option>
                        <option value="english">英語</option>
                        <option value="other">其他</option>
                      </select>
                    </Field>
                  </div>
                </div>

                {/* 遇到的狀況 */}
                <Field label="你們遇到的狀況 (複選)" required error={formErrors.coupleIssues}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
                    {COUPLE_ISSUES.map((issue) => (
                      <label
                        key={issue}
                        className={cn(
                          "flex items-center justify-center p-3 border text-xs text-center cursor-pointer transition-all duration-300",
                          coupleIssues.includes(issue)
                            ? "bg-forest/10 border-forest text-forest font-medium"
                            : "border-sand/30 bg-paper/30 hover:border-sand/65 text-muted"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={coupleIssues.includes(issue)}
                          onChange={() => toggleCoupleIssue(issue)}
                          className="sr-only"
                        />
                        {issue}
                      </label>
                    ))}
                  </div>
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Field label="開始伴侶關係多久？" required error={formErrors.relationshipDuration} hint="如：交往 3 年，或結婚 5 年">
                    <input
                      type="text"
                      value={relationshipDuration}
                      onChange={(e) => setRelationshipDuration(e.target.value)}
                      placeholder="如：交往兩年"
                      className={inputClass(!!formErrors.relationshipDuration)}
                    />
                  </Field>
                  <Field label="育有多少名子女" hint="可以的話，請把性別也列出 (選填)">
                    <input
                      type="text"
                      value={childrenCount}
                      onChange={(e) => setChildrenCount(e.target.value)}
                      placeholder="如：一子一女"
                      className={inputClass(false)}
                    />
                  </Field>
                </div>

                {/* 伴侶困擾文字域 + AI 助手按鈕 */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <label className="block font-sans text-sm text-deep">
                      請說明你們目前遇到的狀況 <span className="text-sand ml-1">*</span>
                    </label>
                    <AIConcernHelper
                      serviceType="couple"
                      onComplete={(summary) => setCoupleConcern(summary)}
                    />
                  </div>
                  <textarea
                    rows={5}
                    value={coupleConcern}
                    onChange={(e) => setCoupleConcern(e.target.value)}
                    placeholder="請描述目前伴侶關係中面臨的困境，或是使用上面的 AI 助寫工具協助..."
                    className={cn(inputClass(!!formErrors.coupleConcern), "resize-none")}
                  />
                  {formErrors.coupleConcern && <p className="text-xs text-red-500 font-sans">{formErrors.coupleConcern}</p>}
                </div>

                {/* 晤談雙方的個別聯絡資料 */}
                <div className="p-4 border-t border-sand/20 space-y-6 bg-paper/20">
                  <h4 className="font-serif text-sm font-semibold text-forest">雙方聯絡管道資料</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="期待的晤談方式" required>
                      <div className="flex gap-6 pt-2">
                        {[{ val: "face", label: "面談" }, { val: "online", label: "線上" }].map((opt) => (
                          <label key={opt.val} className="flex items-center gap-2 cursor-pointer text-xs text-muted">
                            <input
                              type="radio"
                              name="meetingTypeCouple"
                              value={opt.val}
                              checked={meetingTypeCouple === opt.val}
                              onChange={() => setMeetingTypeCouple(opt.val)}
                              className="w-3.5 h-3.5 border border-sand accent-forest"
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </Field>
                    <Field label="聯絡方式" required>
                      <div className="flex gap-6 pt-2">
                        {[{ val: "whatsapp", label: "WhatsApp (推薦)" }].map((opt) => (
                          <label key={opt.val} className="flex items-center gap-2 cursor-pointer text-xs text-muted">
                            <input
                              type="radio"
                              name="contactTypeCouple"
                              value={opt.val}
                              checked={contactTypeCouple === opt.val}
                              onChange={() => setContactTypeCouple(opt.val)}
                              className="w-3.5 h-3.5 border border-sand accent-forest"
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-sand/10 pt-4">
                    <Field label="[A] 聯絡帳號 / ID (WhatsApp手機)" required error={formErrors.contactIdA}>
                      <input type="text" value={contactIdA} onChange={(e) => setContactIdA(e.target.value)} placeholder="WhatsApp 手機號" className={inputClass(!!formErrors.contactIdA)} />
                    </Field>
                    <Field label="[B] 聯絡帳號 / ID (WhatsApp手機)" required error={formErrors.contactIdB}>
                      <input type="text" value={contactIdB} onChange={(e) => setContactIdB(e.target.value)} placeholder="WhatsApp 手機號" className={inputClass(!!formErrors.contactIdB)} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="[A] 電子郵件" required error={formErrors.emailA}>
                      <input type="email" value={emailA} onChange={(e) => setEmailA(e.target.value)} placeholder="yourA@email.com" className={inputClass(!!formErrors.emailA)} />
                    </Field>
                    <Field label="[B] 電子郵件" required error={formErrors.emailB}>
                      <input type="email" value={emailB} onChange={(e) => setEmailB(e.target.value)} placeholder="yourB@email.com" className={inputClass(!!formErrors.emailB)} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="[A] 手機號碼" required error={formErrors.phoneA}>
                      <input type="tel" value={phoneA} onChange={(e) => setPhoneA(e.target.value)} placeholder="手機號 A" className={inputClass(!!formErrors.phoneA)} />
                    </Field>
                    <Field label="[B] 手機號碼" required error={formErrors.phoneB}>
                      <input type="tel" value={phoneB} onChange={(e) => setPhoneB(e.target.value)} placeholder="手機號 B" className={inputClass(!!formErrors.phoneB)} />
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {/* ================= C: 講座工作坊 / 方案計劃 / 其他合作背景 ================= */}
            {serviceType !== "individual" && serviceType !== "couple" && serviceType !== "hoarding" && (
              <div className="space-y-6">
                <h3 className="font-serif text-lg font-medium text-forest border-b border-sand/20 pb-2">
                  機構與合作背景需求
                </h3>
                <p className="text-xs text-muted/70">請提供您的機構或單位資訊，這能協助我們對接相應的心理方案。</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Field label="機構 / 單位名稱" required error={formErrors.companyName}>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="請輸入公司、學校或機構完整名稱"
                      className={inputClass(!!formErrors.companyName)}
                    />
                  </Field>

                  <Field label="聯絡人姓名" required error={formErrors.contactPerson}>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="聯絡窗口姓名"
                      className={inputClass(!!formErrors.contactPerson)}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Field label="主要聯絡方式" required>
                    <div className="flex gap-6 pt-3">
                      {[{ val: "whatsapp", label: "WhatsApp (推薦)" }, { val: "email", label: "Email" }].map((opt) => (
                        <label key={opt.val} className="flex items-center gap-2 cursor-pointer text-sm text-muted">
                          <input
                            type="radio"
                            name="contactTypeOther"
                            value={opt.val}
                            checked={contactTypeOther === opt.val}
                            onChange={() => setContactTypeOther(opt.val)}
                            className="w-4 h-4 border border-sand accent-forest"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </Field>

                  <Field label="聯絡帳號 / ID" required error={formErrors.contactIdOther} hint="如為 WhatsApp 請填手機號，Email 請填電郵">
                    <input
                      type="text"
                      value={contactIdOther}
                      onChange={(e) => setContactIdOther(e.target.value)}
                      placeholder="聯絡號碼或 ID"
                      className={inputClass(!!formErrors.contactIdOther)}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Field label="聯絡電子郵件" required error={formErrors.emailOther}>
                    <input
                      type="email"
                      value={emailOther}
                      onChange={(e) => setEmailOther(e.target.value)}
                      placeholder="contact@domain.com"
                      className={inputClass(!!formErrors.emailOther)}
                    />
                  </Field>

                  <Field label="聯絡電話" required error={formErrors.phoneOther}>
                    <input
                      type="tel"
                      value={phoneOther}
                      onChange={(e) => setPhoneOther(e.target.value)}
                      placeholder="手機或辦公室電話"
                      className={inputClass(!!formErrors.phoneOther)}
                    />
                  </Field>
                </div>

                <Field label="項目或活動主題 (選填)" hint="例如：大專生情緒調適講座，或員工心理健康方案計劃">
                  <input
                    type="text"
                    value={projectTheme}
                    onChange={(e) => setProjectTheme(e.target.value)}
                    placeholder="預期的活動主題"
                    className={inputClass(false)}
                  />
                </Field>

                {/* 詳細需求說明 */}
                <div className="space-y-2">
                  <label className="block font-sans text-sm text-deep font-medium">
                    詳細需求說明 <span className="text-sand ml-1">*</span>
                  </label>
                  <p className="text-xs text-muted/70">請簡單描述活動目的、對象、預算、期望舉辦的月份或其它具體合作細節。</p>
                  <textarea
                    rows={6}
                    value={otherConcern}
                    onChange={(e) => setOtherConcern(e.target.value)}
                    placeholder="例如：我們想為學校大約 50 名學生舉辦一場 2 小時的情緒調適工作坊，希望在 8 月中旬辦理... (也可以使用上方的 AI 助理協助您梳理！)"
                    className={cn(inputClass(!!formErrors.otherConcern), "resize-none")}
                  />
                  {formErrors.otherConcern && <p className="text-xs text-red-500 font-sans">{formErrors.otherConcern}</p>}
                </div>
              </div>
            )}

            {/* ================= 時間、同意書與手寫簽名 ================= */}
            <div className="pt-8 border-t border-sand/20 space-y-6">
              
              {/* 1. 時間選擇 */}
              {(serviceType === "individual" || serviceType === "hoarding") ? (
                <div className="space-y-4">
                  <div>
                    <label className="block font-sans text-sm text-deep font-medium">
                      可聯絡與可晤談時間 <span className="text-sand ml-1">*</span>
                    </label>
                    <p className="text-xs text-muted/70 mt-1">請至少選擇 3 個可行的時段，勾選越多，行政越容易為您成功媒合排班。</p>
                    <p className="text-xs text-sand/80 font-medium">* 以澳門 / 北京 / 台灣時間為準 (UTC+8)</p>
                  </div>
                  
                  {/* 15x7 時間網格 */}
                  <div className="overflow-x-auto border border-sand/20">
                    <table className="min-w-full text-center text-xs border-collapse">
                      <thead>
                        <tr className="bg-forest/5 border-b border-sand/20">
                          <th className="py-2.5 px-2 border-r border-sand/20 font-serif font-medium text-deep w-20">時段</th>
                          {DAYS_OF_WEEK.map((day) => (
                            <th key={day} className="py-2.5 px-1 font-serif font-medium text-deep border-r border-sand/20">
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {TIME_SLOTS.map((slot) => (
                          <tr key={slot} className="border-b border-sand/10 hover:bg-forest/5 transition-colors">
                            <td className="py-2 px-2 border-r border-sand/20 font-sans text-muted text-xs whitespace-nowrap">{slot}</td>
                            {DAYS_OF_WEEK.map((day) => {
                              const key = `${day}-${slot}`;
                              const checked = !!selectedTimesGrid[key];
                              return (
                                <td key={day} className="py-2 px-1 border-r border-sand/20">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleTimeGrid(day, slot)}
                                    className="w-4 h-4 border border-sand accent-forest cursor-pointer"
                                    aria-label={`${day} ${slot}`}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
                {formErrors.times && <p className="text-xs text-red-500 font-sans">{formErrors.times}</p>}
              </div>
            ) : serviceType === "couple" ? (
              <div className="space-y-4">
                <div>
                  <label className="block font-sans text-sm text-deep font-medium">
                    方便晤談的時間 (伴侶心理輔導專屬時段) <span className="text-sand ml-1">*</span>
                  </label>
                  <p className="text-xs text-muted/70 mt-1">目前伴侶輔導僅提供下列預選時段進行，請至少勾選一項可行的時間。</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-paper/30 border border-sand/15">
                  {COUPLE_TIME_SLOTS.map((time) => (
                    <label key={time} className="flex items-center gap-3 p-2 border border-sand/20 hover:border-sand/40 bg-paper/50 cursor-pointer text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={selectedCoupleTimes.includes(time)}
                        onChange={() => toggleCoupleTime(time)}
                        className="w-4 h-4 border border-sand accent-forest"
                      />
                      {time}
                    </label>
                  ))}
                </div>
                {formErrors.times && <p className="text-xs text-red-500 font-sans">{formErrors.times}</p>}
              </div>
            ) : (
              // 講座、方案與其他機構預約，不顯示時間網格
              <div className="p-4 bg-forest/5 border border-forest/10 space-y-2">
                <h3 className="font-serif text-sm font-semibold text-forest">項目時間安排說明</h3>
                <p className="text-xs text-muted leading-relaxed">
                  對於講座工作坊、方案撰寫等非諮詢合作需求，行政人員將在收到表單後，直接與您的聯絡人對接合適的舉辦日期與方案規劃時間，無須在線勾選固定時段。
                </p>
              </div>
            )}

            {/* 2. 知情同意與隱私說明 */}
            <div className="pt-6 border-t border-sand/20 space-y-4">
              <h3 className="font-serif text-base text-forest">知情同意與隱私說明</h3>
              <div className="bg-paper/70 p-5 text-xs text-muted/95 leading-relaxed space-y-3 border border-sand/15 overflow-y-auto max-h-48 select-text">
                <p>1. 本工作室為澳門私營心理輔導機構。所有填寫之預約表單、需求描述以及您的個人與單位資料均受到嚴格保護，僅用於本工作室安排輔導或對接項目需求。</p>
                <p>2. 對於心理輔導個案，晤談內容均嚴格保密。唯保密限制之例外（如涉及自傷、傷人意圖或法律強制規定），本工作室將基於安全倫理在儘可能告知您的情況下，通報相關機構協助。</p>
                <p>3. 依據澳門相關衛生與法律規定，我們提供之服務定位為非醫療性的心理輔導與關係諮商，並不涉及精神科醫師診斷、法規醫學評估或藥物開立。若評估您的身心狀態需要醫療介入，我們將為您提供轉介指引。</p>
                <p>4. 若有需要變更或取消已確認的晤談時間，請於預約時間前至少 24 小時聯絡行政客服。</p>
              </div>
              
              {/* 手寫簽名 */}
              <div className="space-y-2">
                <label className="block font-sans text-sm text-deep">
                  請於下方灰色區域手寫簽名以示同意 <span className="text-sand ml-1">*</span>
                </label>
                {serviceType === "couple" && (
                  <p className="font-sans text-xs text-muted/70">申請人簽名即可，不需要雙方簽署。</p>
                )}
                <SignatureCanvas onChange={(img) => setSignature(img)} />
                {formErrors.signature && <p className="text-xs text-red-500 font-sans font-medium">{formErrors.signature}</p>}
              </div>

              {/* 條款同意 Checkbox */}
              <div className="pt-3">
                <label className="flex gap-3 items-start cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 border border-sand accent-forest cursor-pointer flex-shrink-0"
                  />
                  <span className="font-sans text-xs text-muted leading-relaxed select-none">
                    我已閱讀並完全理解上述說明，且明白工作室將以嚴格保密方式處理表單資料，特簽署此表單送出預約。
                  </span>
                </label>
                {formErrors.consent && (
                  <p className="mt-2 text-xs text-red-500 font-sans font-medium">{formErrors.consent}</p>
                )}
              </div>
            </div>

            {/* 導航按鈕 */}
            <div className="flex justify-between pt-6 border-t border-sand/20">
              <button
                type="button"
                onClick={handleBack}
                disabled={submitState === "loading"}
                className="px-6 py-3.5 border border-sand/30 hover:bg-soft text-sm text-muted transition-colors cursor-pointer disabled:opacity-50"
              >
                返回修改
              </button>
              
              <button
                type="submit"
                disabled={submitState === "loading"}
                className={cn(
                  "px-8 py-3.5 font-sans text-sm tracking-wide transition-all duration-200 cursor-pointer text-paper",
                  submitState === "loading"
                    ? "bg-muted/30 text-muted cursor-not-allowed"
                    : "bg-forest hover:bg-deep"
                )}
              >
                {submitState === "loading" ? "提交中…" : "確認並送出預約申請"}
              </button>
            </div>
            
            {submitState === "error" && (
              <p className="text-xs text-red-500 font-sans bg-red-50 border border-red-200 p-3 mt-3">
                提交時出現錯誤，請確認您的網路連線。若持續失敗，可直接以 WhatsApp 或 Email 聯絡行政人員安排。
              </p>
            )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

/* 輔助欄位組件 */
function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="block font-sans text-sm text-deep font-medium">
        {label}
        {required && <span className="text-sand ml-1">*</span>}
      </label>
      {hint && <p className="text-xs font-sans text-muted/65 leading-relaxed">{hint}</p>}
      {children}
      {error && <p className="text-xs text-red-500 font-sans font-medium">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return cn(
    "w-full px-4 py-3 bg-paper/80 border font-sans text-sm text-deep placeholder:text-muted/40 outline-none transition-colors duration-200",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-400"
      : "border-sand/30 focus:border-forest hover:border-sand/50"
  );
}
