"use client";

import { useState } from "react";
import FadeIn from "@/components/ui/FadeIn";
import { SproutVine, SwayingFlower } from "@/components/ui/VibrantPlants";

const FAQ_ITEMS = [
  {
    category: "counseling",
    question: "心理輔導究竟在做什麼？真的有用嗎？",
    answer: "心理輔導是一段「安全、保密且不帶批判」的陪伴過程。輔導人員透過專業的傾聽與對話技術，陪伴您釐清混亂的思緒、覺察潛在的情緒與行為模式，並探索新的生活可能。輔導的成效往往建立在您與輔導人員之間的信任關係，以及您對自我探索的開放度上，它可以有效協助我們排解情緒壓力、改善人際關係並獲得個人成長。",
  },
  {
    category: "counseling",
    question: "我需要接受心理輔導嗎？什麼情況下應該要求助？",
    answer: "每個人在生命的不同階段都可能遭遇困境。當您感到情緒持續低落、焦慮、失眠、人際關係（伴侶、家庭、職場）出現瓶頸，或者正面臨重大的生涯轉折、哀傷經歷，且這些狀況已經開始干擾到您的日常生活時，就是一個尋求專業支持的良好時機。您不一定要等到身心完全崩潰才求助，預防與早期的自我探索同樣重要。",
  },
  {
    category: "counseling",
    question: "線上輔導（視訊）與面談輔導的效果有差別嗎？",
    answer: "多項研究指出，線上視訊輔導在抑鬱、焦慮及一般生活壓力等議題上，能達到與面談輔導非常相近的效果。線上輔導的優勢在於突破地域限制，讓您能在自己感到安心、私密的空間（如家中）進行，省去舟車勞頓；而面談輔導則能提供更具實體存在感的陪伴。預約時您可以根據自己的需求、居住地與便利性進行選擇。",
  },
  {
    category: "booking",
    question: "收費標準是多少？要如何付款？",
    answer: "樹心理工作室清楚列出服務收費（請參閱「心理服務」頁面）。個人心理輔導每節（50分鐘）收費為 MOP 700 - 900；伴侶心理輔導每節（80分鐘）收費為 MOP 1,000。我們目前支持 Mpay、中銀轉帳、微信支付、支付寶、Alipay HK 等電子支付方式，行政人員將於與您手動確認預約時提供詳細的帳戶收款資訊。",
  },
  {
    category: "booking",
    question: "每次諮商需要多長時間？通常需要進行多少次？",
    answer: "標準的個人心理輔導每節為 50 分鐘，伴侶輔導則為 80 分鐘。至於需要進行多少次，完全取決於您的議題性質、困擾程度以及您希望達到的諮商目標。有些單一的生涯抉擇可能只需 4-6 次諮商即可釐清；而深層的性格調整、長期創傷或關係修復，則可能需要數個月甚至更長期的定期陪伴。您可以與您的心理師共同討論並決定進程。",
  },
  {
    category: "privacy",
    question: "我們在諮商室裡談的所有內容都會保密嗎？",
    answer: "是的，保密是心理輔導的核心首要原則。您所填寫的預約表單、諮商紀錄以及談話的所有細節，皆受到專業倫理的嚴格保護。除非在極少數涉及您或他人生命安全的緊急情況（如自傷或傷人意圖），輔導人員才依法有義務在告知您的前提下進行必要通報。否則，未經您本人書面同意，我們絕不會向任何第三方（包括家人、伴侶或機構）洩露您的個人隱私。",
  },
  {
    category: "booking",
    question: "如果臨時有事需要更改時間或取消預約，該怎麼辦？",
    answer: "為了尊重心理師的時間並保障其他候診個案的權益，若您需要更改或取消預約，請於「預約時間前至少 24 小時」聯絡工作室行政客服（可透過 WhatsApp 或 Email）。若於 24 小時內臨時取消，我們可能會酌收部分行政行政費用，敬請諒解。",
  },
  {
    category: "privacy",
    question: "工作室有提供醫療診斷、心理評估或開立藥物服務嗎？",
    answer: "依據澳門的相關法律規定，樹心理工作室作為非醫療性的私營心理輔導機構，我們「未能提供」精神科醫療診斷、法定心理評估報告以及藥物治療。我們的服務著重於心理輔導、關係諮商、自我成長與推廣心理健康教育。若評估您的身心狀況需要醫療介入，我們會為您提供轉介建議，引導您前往合適的醫療機構就診。",
  },
];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState<"all" | "counseling" | "booking" | "privacy">("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filteredItems = FAQ_ITEMS.filter(
    (item) => activeCategory === "all" || item.category === activeCategory
  );

  const toggleFAQ = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="relative w-full overflow-hidden bg-background isolate">
      {/* 頁面級全景水墨背景層 (z-[-1], 超低不透明度，30秒緩慢發芽) */}
      
      {/* 1. 左上水墨禪竹 */}
      <SproutVine className="absolute left-[2%] top-[80px] w-[280px] h-[480px] sm:w-[380px] sm:h-[650px] opacity-[0.06] z-[-1] pointer-events-none" variant="forest" />
      
      {/* 2. 右下水墨荷花 */}
      <SwayingFlower className="absolute right-[2%] bottom-[120px] w-[280px] h-[400px] sm:w-[380px] sm:h-[540px] opacity-[0.08] z-[-1] pointer-events-none" mirror={true} variant="default" />

      {/* 前景內容層 (z-10, bg-transparent) */}
      <div className="relative z-10 bg-transparent">
        
        {/* Header */}
        <section className="bg-transparent pt-36 pb-16">
          <div className="max-w-6xl mx-auto px-6">
            <FadeIn>
              <p className="text-xs font-sans tracking-widest text-sand uppercase mb-4">FAQ</p>
              <h1 className="font-serif text-deep text-4xl md:text-5xl leading-tight mb-6">
                常見問題
              </h1>
              <p className="font-sans text-muted text-sm max-w-lg leading-relaxed">
                在此整理了關於心理輔導流程、隱私保密、收費標準等常見的疑惑。
                希望能幫助您在開始諮商之前，感到更加安心與清晰。
              </p>
            </FadeIn>
          </div>
        </section>

        {/* Main Content */}
        <section className="bg-transparent py-16 md:py-20">
          <div className="max-w-4xl mx-auto px-6">
            
            {/* Category Filter (重塑為日式箋紙小籤) */}
            <FadeIn className="flex flex-wrap gap-3 mb-16 border-b border-sand/15 pb-6 overflow-x-auto">
              {[
                { id: "all", label: "全部問題" },
                { id: "counseling", label: "關於輔導" },
                { id: "booking", label: "預約與收費" },
                { id: "privacy", label: "保密與範疇" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id as any);
                    setOpenIndex(null);
                  }}
                  className={`px-4 py-1.5 border font-sans text-xs tracking-wide transition-all cursor-pointer rounded-none whitespace-nowrap ${
                    activeCategory === cat.id
                      ? "border-forest bg-forest text-paper font-medium"
                      : "border-sand/15 bg-paper/20 text-muted hover:border-forest/40 hover:text-forest"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </FadeIn>

            {/* Accordion list (改為半透明紙質 backdrop-blur 與極細壓線) */}
            <div className="space-y-4">
              {filteredItems.map((item, idx) => {
                const isOpen = openIndex === idx;
                return (
                  <FadeIn key={idx} direction="up" delay={idx * 40}>
                    <div className="border border-sand/15 bg-paper/40 backdrop-blur-[2px] hover:bg-paper/60 transition-all duration-300">
                      <button
                        onClick={() => toggleFAQ(idx)}
                        className="w-full text-left px-6 py-5 flex justify-between items-center gap-4 cursor-pointer group"
                      >
                        <span className="font-serif text-deep text-base md:text-lg group-hover:text-forest transition-colors">
                          {item.question}
                        </span>
                        <span className={`text-sand text-lg transform transition-transform duration-300 font-sans ${isOpen ? "rotate-45 text-forest" : "group-hover:text-forest"}`}>
                          ＋
                        </span>
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-300 ${
                          isOpen ? "max-h-[300px] opacity-100 border-t border-sand/10" : "max-h-0 opacity-0"
                        }`}
                      >
                        <p className="px-6 py-5 font-sans text-muted text-sm leading-relaxed whitespace-pre-line bg-paper/10">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </FadeIn>
                );
              })}
            </div>

            {/* Fallback Contact CTA */}
            <FadeIn className="mt-24 text-center space-y-4">
              <p className="font-sans text-muted text-sm">還有其他想了解的事情嗎？</p>
              <div className="flex justify-center gap-6">
                <a
                  href="https://wa.me/85362772234"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-sans text-forest hover:text-deep transition-colors border-b border-forest/30 hover:border-forest pb-0.5 cursor-pointer"
                >
                  WhatsApp 聯絡行政客服
                </a>
                <a
                  href="mailto:admin@treecounseling.com"
                  className="text-xs font-sans text-forest hover:text-deep transition-colors border-b border-forest/30 hover:border-forest pb-0.5 cursor-pointer"
                >
                  發送 Email 查詢
                </a>
              </div>
            </FadeIn>
          </div>
        </section>
      </div>
    </div>
  );
}
