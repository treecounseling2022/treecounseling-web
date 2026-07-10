import FadeIn from "@/components/ui/FadeIn";
import ScrollDivider from "@/components/ui/ScrollDivider";
import { CONTACT } from "@/lib/data";

const SECTIONS = [
  {
    title: "一、我們收集哪些資料",
    body: [
      "當您透過網站填寫預約表單、心理自評、初談表或聯絡我們時，我們可能收集以下資料：姓名、性別、出生日期、聯絡電話、電子郵件、WhatsApp、方便聯絡的時段，以及您在表單中主動提供的求助議題描述。",
      "若您成為來訪者，心理輔導人員在諮商輔導過程中製作的個案紀錄、評估與往來訊息，亦屬於受本政策保護的個人資料，並額外受專業保密倫理規範約束。",
    ],
  },
  {
    title: "二、我們如何使用您的資料",
    body: [
      "安排並確認預約、透過 Email／WhatsApp 與您聯繫、寄送預約確認信及提醒。",
      "由心理輔導人員進行輔導評估與提供服務。",
      "處理付款與開立收據紀錄。",
    ],
  },
  {
    title: "三、資料的保存與第三方服務",
    body: [
      "您的資料儲存於 Supabase（付費的美國資料庫服務公司），服務商僅依我們的指示處理資料，不會將您的資料用於其他目的。",
      "我們不會將您的個人資料出售、出租或提供予任何行銷用途的第三方。",
      "諮商紀錄依專業倫理及法規要求之期限保存，逾期將依安全方式刪除或去識別化處理。",
    ],
  },
  {
    title: "四、保密原則與例外",
    body: [
      "保密是心理輔導服務的核心原則。您的諮商輔導內容、個人資料未經書面同意，不會向任何第三方（包括家人、伴侶或其他機構）揭露。",
      "唯依法律規定，或在極少數涉及您本人或他人生命安全的緊急情況（如自傷、傷人意圖或懷疑虐待未成年人／受保護人士）、涉及刑法時，輔導人員有義務在儘可能告知您的前提下，採取必要的通報或介入行動。",
    ],
  },
  {
    title: "五、政策更新",
    body: [
      "我們可能不定期修訂本政策以反映服務或法規變動，最新版本將公佈於本頁面。若有重大變更，我們會於網站首頁另行公告。",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="relative w-full overflow-hidden bg-background">
      <div className="relative z-10 bg-transparent">
        {/* Page Header */}
        <section className="bg-transparent pt-36 pb-16">
          <div className="max-w-3xl mx-auto px-6">
            <FadeIn>
              <p className="text-xs font-sans tracking-widest text-sand uppercase mb-4">
                Privacy Policy
              </p>
              <h1 className="font-serif text-deep text-4xl md:text-5xl leading-tight mb-6">
                隱私權政策
              </h1>
              <p className="font-sans text-muted text-sm leading-relaxed">
                最後更新日期：2026 年 7 月。樹心理工作室重視您的隱私，本政策說明我們如何收集、使用及保護您透過本網站或服務所提供的個人資料。
              </p>
            </FadeIn>
          </div>
        </section>

        {/* Content */}
        <section className="bg-transparent py-8 md:py-12 relative overflow-hidden">
          <ScrollDivider className="absolute top-0 left-0" />
          <div className="max-w-3xl mx-auto px-6 space-y-14">
            {SECTIONS.map((section, idx) => (
              <FadeIn key={section.title} direction="up" delay={idx * 30}>
                <h2 className="font-serif text-deep text-xl md:text-2xl mb-4">
                  {section.title}
                </h2>
                <div className="space-y-3">
                  {section.body.map((p, i) => (
                    <p key={i} className="font-sans text-muted text-sm leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
              </FadeIn>
            ))}

            <FadeIn direction="up" className="pt-8 border-t border-sand/15">
              <h2 className="font-serif text-deep text-xl md:text-2xl mb-4">聯絡我們</h2>
              <p className="font-sans text-muted text-sm leading-relaxed">
                如對本政策或您的個人資料處理方式有任何疑問，請透過以下方式與我們聯繫：
              </p>
              <ul className="mt-3 space-y-1 font-sans text-sm">
                <li>
                  <a href={`mailto:${CONTACT.email}`} className="text-forest hover:text-deep transition-colors">
                    {CONTACT.email}
                  </a>
                </li>
                <li>
                  <a
                    href={CONTACT.whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-forest hover:text-deep transition-colors"
                  >
                    WhatsApp {CONTACT.whatsapp}
                  </a>
                </li>
              </ul>
            </FadeIn>
          </div>
        </section>
      </div>
    </div>
  );
}
