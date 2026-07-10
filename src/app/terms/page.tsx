import FadeIn from "@/components/ui/FadeIn";
import ScrollDivider from "@/components/ui/ScrollDivider";
import { CONTACT } from "@/lib/data";

const SECTIONS = [
  {
    title: "一、服務性質",
    body: [
      "樹心理工作室是澳門的私營心理輔導機構，提供個人輔導、伴侶輔導、線上輔導及工作坊等服務。我們的服務屬於非醫療性質，「不」提供精神科醫療診斷、法定心理評估報告或藥物治療。若認為您的狀況需要醫療介入，我們會提供轉介建議。",
      "本服務並非緊急救援管道，不適用於處理生命危險的緊急情況。如遇緊急狀況，請立即撥打澳門緊急電話 999，或前往最近的醫院急診。",
      "本服務僅提供予 18 歲或以上人士。",
    ],
  },
  {
    title: "二、預約與取消政策",
    body: [
      "您可透過本網站的預約表單提出申請，行政人員將以人手方式與您聯繫確認時段，並寄送正式確認信。",
      "如需更改或取消預約，請於預約時間前至少 24 小時，透過 WhatsApp 或 Email 通知工作室行政客服。",
      "若於 24 小時內臨時取消或未出席（No-show），我們可能酌收不超於 50% 的費用，具體視情況而定。",
    ],
  },
  {
    title: "三、收費與付款方式",
    body: [
      "服務收費請以「心理服務」頁面公佈的價目為準：個人心理輔導每節（50 分鐘）收費為 MOP 700–900；伴侶心理輔導每節（80 分鐘）收費為 MOP 1,000。工作室保留因應成本調整收費之權利，惟已確認之預約不受調整影響。",
      "目前支援 Mpay、中銀轉帳、微信支付、支付寶、Alipay HK 等付款方式，行政人員將於確認預約時提供收款資訊。",
    ],
  },
  {
    title: "四、保密與紀錄",
    body: [
      "諮商輔導過程中的內容受專業保密倫理保護，詳細說明請參閱我們的隱私權政策。",
      "唯依法律規定，或涉及您本人或他人生命安全的緊急情況，輔導人員有義務在儘可能告知您的前提下採取必要行動。",
    ],
  },
  {
    title: "五、責任範圍",
    body: [
      "心理輔導的成效因人而異，取決於多項因素（包括您的參與程度、議題性質等），工作室無法保證特定的輔導結果。",
      "本網站內容（包括心理自評、常見問題等）僅供一般參考，不能取代專業的個別評估與診斷。",
    ],
  },
  {
    title: "六、智慧財產權",
    body: [
      "本網站之文字、圖片、標誌及設計，除另有標明外，其著作權均屬樹心理工作室所有，未經授權不得轉載或作商業用途。",
    ],
  },
  {
    title: "七、條款修改",
    body: [
      "我們可能不定期修訂本條款以反映服務或法規變動，最新版本將公佈於本頁面。若您於條款修改後持續使用本服務，即視為您接受修改後之條款。",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="relative w-full overflow-hidden bg-background">
      <div className="relative z-10 bg-transparent">
        {/* Page Header */}
        <section className="bg-transparent pt-36 pb-16">
          <div className="max-w-3xl mx-auto px-6">
            <FadeIn>
              <p className="text-xs font-sans tracking-widest text-sand uppercase mb-4">
                Terms of Service
              </p>
              <h1 className="font-serif text-deep text-4xl md:text-5xl leading-tight mb-6">
                服務條款
              </h1>
              <p className="font-sans text-muted text-sm leading-relaxed">
                最後更新日期：2026 年 7 月。使用本網站或預約我們的服務前，請詳閱以下條款。
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
                如對本條款有任何疑問，請透過以下方式與我們聯繫：
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
