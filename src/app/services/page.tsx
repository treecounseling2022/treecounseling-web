import type { Metadata } from "next";
import Link from "next/link";
import FadeIn from "@/components/ui/FadeIn";
import ScrollDivider from "@/components/ui/ScrollDivider";
import { SwayingFlower, SproutVine, BloomingWildflower, ClimbingIvy, LushFern, MonsteraLeaf, BerryBranch, WeepingWillow } from "@/components/ui/VibrantPlants";
import { SERVICES } from "@/lib/data";
import { CONTACT } from "@/lib/data";

export const metadata: Metadata = {
  title: "心理服務",
  description:
    "樹心理工作室提供個人心理輔導、伴侶心理輔導、線上輔導、講座工作坊等服務。服務對象：18歲或以上，澳門。",
};

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  person: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  couple: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  ),
  online: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
    </svg>
  ),
  workshop: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  ),
  document: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  hoarding: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
};

export default function ServicesPage() {
  const displayServices = SERVICES.filter((s) => s.id !== "online");

  return (
    <div className="relative w-full overflow-hidden bg-background">
      {/* 頁面級全景水墨背景層 (z-0, opacity-5, 30秒慢生長) */}
      
      {/* 1. 右上水墨垂柳 (Header 背景) */}
      <WeepingWillow className="absolute right-0 top-[120px] w-[300px] h-[450px] sm:w-[400px] sm:h-[600px] opacity-5 z-0 pointer-events-none" mirror={true} variant="cool" />
      
      {/* 2. 左下水墨荷花 (收費流程與標準背景) */}
      <SwayingFlower className="absolute left-[2%] top-[950px] w-[320px] h-[320px] sm:w-[450px] sm:h-[450px] opacity-5 z-0 pointer-events-none" variant="warm" />
      
      {/* 3. 右下水墨禪竹 (CTA 背景) */}
      <SproutVine className="absolute right-[2%] top-[1550px] w-[280px] h-[450px] sm:w-[380px] sm:h-[600px] opacity-5 z-0 pointer-events-none" mirror={true} variant="forest" />

      {/* 前景內容層 (z-10, bg-transparent) */}
      <div className="relative z-10 bg-transparent">
        
        {/* Header */}
        <section className="bg-transparent pt-36 pb-16 relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="max-w-3xl">
              <FadeIn>
                <p className="text-xs font-sans tracking-widest text-sand uppercase mb-4">Services</p>
                <h1 className="font-serif text-deep text-4xl md:text-5xl leading-tight mb-6">
                  心理服務
                </h1>
                <p className="font-sans text-muted text-sm max-w-xl leading-relaxed">
                  服務對象：18歲或以上，非緊急情形。
                  基於澳門的法律規定，我們僅提供專業心理諮商與輔導，不提供醫療性質之診斷、藥物與心理治療。
                </p>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="bg-transparent py-20 md:py-28 relative">
          <ScrollDivider className="absolute top-0 left-0" />
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-16">
              {displayServices.map((service, i) => (
                <FadeIn key={service.id} delay={i * 80} direction="up">
                  <div className="group space-y-4 pb-8 border-b border-sand/15 h-full flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="text-forest/70 mb-2 w-8 h-8 flex items-center justify-start group-hover:text-forest transition-colors">
                        {SERVICE_ICONS[service.icon]}
                      </div>
                      <h2 className="font-serif text-deep text-xl md:text-2xl">{service.title}</h2>
                      <p className="font-sans text-sand text-xs tracking-wider">{service.subtitle}</p>
                      <p className="font-sans text-muted text-sm leading-relaxed pt-2">{service.description}</p>
                    </div>
                    <div className="pt-4">
                      <Link
                        href={`/booking?service=${service.id}`}
                        className="text-xs font-sans text-muted group-hover:text-forest transition-colors link-underline pb-0.5"
                      >
                        預約此項服務 →
                      </Link>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Process note & Fees */}
        <section className="bg-transparent py-20 md:py-28 relative overflow-hidden">
          <ScrollDivider className="absolute top-0 left-0" />
          
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
              {/* Left: Process */}
              <FadeIn direction="left" className="lg:col-span-5 space-y-8">
                <div>
                  <p className="text-xs font-sans tracking-widest text-sand uppercase mb-4">服務流程</p>
                  <h2 className="font-serif text-deep text-2xl md:text-3xl mb-8">如何開始</h2>
                  <div className="space-y-6">
                    {[
                      { step: "01", text: "填寫線上預約表單，告知方便的時段與服務類型" },
                      { step: "02", text: "我們收到申請後，會與心理師確認時段安排" },
                      { step: "03", text: "行政人員聯繫你確認正式預約時間與發送匯款資訊" },
                      { step: "04", text: "收到確認信，於約定時間前來或連線開始" },
                    ].map((item) => (
                      <div key={item.step} className="flex gap-5 items-start">
                        <span className="font-garamond text-sand text-lg flex-shrink-0 w-8">{item.step}</span>
                        <p className="font-sans text-muted text-sm leading-relaxed pt-0.5">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>

              {/* Right: Fees card */}
              <FadeIn direction="right" delay={150} className="lg:col-span-7 w-full">
                <div className="bg-soft/60 backdrop-blur-xs p-8 md:p-10 text-deep space-y-6">
                  <h3 className="font-serif text-forest text-xl border-b border-sand/20 pb-3">收費標準</h3>
                  <div className="space-y-4 font-sans text-muted text-sm leading-relaxed">
                    <div className="flex justify-between border-b border-sand/10 pb-2">
                      <span>個人心理輔導 (面談或線上，50分鐘)</span>
                      <span className="font-serif text-deep font-medium">MOP 700 - 900</span>
                    </div>
                    <div className="flex justify-between border-b border-sand/10 pb-2">
                      <span>伴侶心理輔導 (80分鐘)</span>
                      <span className="font-serif text-deep font-medium">MOP 1,000</span>
                    </div>
                    <div className="flex justify-between border-b border-sand/10 pb-2">
                      <span>講座和工作坊 (客製化)</span>
                      <span className="font-serif text-deep font-medium">歡迎聯繫報價</span>
                    </div>
                    <div className="flex justify-between border-b border-sand/10 pb-2">
                      <span>方案與計劃設計</span>
                      <span className="font-serif text-forest font-medium">免費協助 *</span>
                    </div>
                    <p className="text-[11px] text-muted/60 leading-relaxed">
                      * 方案設計若後續活動交由樹心理工作室執行，則不另收方案撰寫與規劃費用。
                    </p>
                    <p className="text-xs text-sand font-medium pt-2 leading-relaxed">
                    付款方式：僅支持 Mpay、中銀轉帳、微信支付、支付寶、Alipay HK 等電子支付。行政人員確認預約後將提供收款資訊。
                    </p>
                  </div>
                  <div className="mt-6 pt-6 border-t border-sand/20 flex flex-col sm:flex-row gap-6">
                    <a
                      href={CONTACT.whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-sans text-muted hover:text-forest transition-colors link-underline pb-0.5 cursor-pointer"
                    >
                      WhatsApp: {CONTACT.whatsapp}
                    </a>
                    <a
                      href={`mailto:${CONTACT.email}`}
                      className="text-xs font-sans text-muted hover:text-forest transition-colors link-underline pb-0.5 cursor-pointer"
                    >
                      Email: {CONTACT.email}
                    </a>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-transparent py-24 md:py-32 relative text-center overflow-hidden">
          <ScrollDivider className="absolute top-0 left-0" />
          
          <div className="max-w-4xl mx-auto px-6 relative z-10">
            <div className="max-w-xl mx-auto space-y-10">
              <FadeIn className="space-y-4">
                <p className="text-xs font-sans tracking-widest text-sand uppercase">
                  Let's Begin
                </p>
                <h2 className="font-serif text-deep text-3xl md:text-4xl leading-tight">
                  準備好開始了嗎？
                </h2>
                <p className="font-sans text-muted text-sm leading-relaxed max-w-md mx-auto">
                  我們提供安全、保密且溫馨的空間。
                  當你感覺準備好了，歡迎你寫下第一頁信紙，讓我們陪你一起前行。
                </p>
              </FadeIn>

              <FadeIn delay={150} className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                  <Link
                    href="/booking"
                    className="inline-flex items-center px-8 py-3.5 bg-forest text-paper text-sm font-sans tracking-wide hover:bg-deep transition-all cursor-pointer"
                  >
                    前往填寫預約表單
                  </Link>
                  <a
                    href={CONTACT.whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-sans text-muted hover:text-forest transition-colors link-underline pb-0.5 cursor-pointer"
                  >
                    透過 WhatsApp 聯絡行政查詢 →
                  </a>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
