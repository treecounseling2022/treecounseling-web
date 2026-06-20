import { Suspense } from "react";
import type { Metadata } from "next";
import FadeIn from "@/components/ui/FadeIn";
import BookingForm from "@/components/sections/BookingForm";

export const metadata: Metadata = {
  title: "預約諮商輔導",
  description:
    "填寫預約表單，樹心理工作室將盡快與您確認諮商晤談時段。所有資料嚴格保密。",
};

export default function BookingPage() {
  return (
    <>
      {/* Header */}
      <section className="bg-deep pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn>
            <p className="text-xs font-sans tracking-widest text-sand uppercase mb-4">Booking</p>
            <h1 className="font-serif text-paper text-4xl md:text-6xl leading-tight mb-6">
              預約諮商輔導
            </h1>
            <p className="font-sans text-paper/60 text-base max-w-lg leading-relaxed">
              填寫以下表單，我們會在收到申請後盡快與您聯繫確認時段。
              所有個人資料及諮詢內容嚴格保密。
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Form + Info */}
      <section className="bg-paper py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {/* Sidebar Info */}
            <FadeIn direction="left" className="md:col-span-1">
              <div className="space-y-10 sticky top-24">
                <div>
                  <p className="text-xs font-sans tracking-widest text-sand uppercase mb-4">流程說明</p>
                  <div className="space-y-5">
                    {[
                      { step: "1", text: "填寫預約表單" },
                      { step: "2", text: "系統自動發送「已收到申請」確認信" },
                      { step: "3", text: "我們與心理輔導人員確認時段" },
                      { step: "4", text: "行政人員聯繫您確認正式預約" },
                      { step: "5", text: "收到確認信，如期進行" },
                    ].map((item) => (
                      <div key={item.step} className="flex gap-4 items-start">
                        <span className="w-6 h-6 flex-shrink-0 border border-sand/40 flex items-center justify-center font-garamond text-sand text-sm">
                          {item.step}
                        </span>
                        <p className="font-sans text-muted text-sm leading-relaxed pt-0.5">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-sand/20">
                  <p className="text-xs font-sans tracking-widest text-sand uppercase mb-4">直接聯繫</p>
                  <div className="space-y-2">
                    <a
                      href="https://wa.me/85362772234"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-sans text-muted hover:text-forest transition-colors cursor-pointer"
                    >
                      <span className="text-sand">→</span> WhatsApp +853 6277 2234
                    </a>
                    <a
                      href="mailto:admin@treecounseling.com"
                      className="flex items-center gap-2 text-sm font-sans text-muted hover:text-forest transition-colors cursor-pointer"
                    >
                      <span className="text-sand">→</span> admin@treecounseling.com
                    </a>
                  </div>
                </div>

                <div className="pt-6 border-t border-sand/20">
                  <p className="text-xs font-sans text-muted/60 leading-relaxed">
                    服務對象：18歲或以上，非緊急情形。
                    如遇緊急情況，請致電澳門生命熱線：
                    <strong className="text-muted"> 2852 5777</strong>
                  </p>
                </div>
              </div>
            </FadeIn>

            {/* Form */}
            <FadeIn direction="right" delay={150} className="md:col-span-2">
              <Suspense fallback={<div className="bg-soft border border-sand/20 p-10 text-center font-sans text-muted text-sm">載入預約表單中...</div>}>
                <BookingForm />
              </Suspense>
            </FadeIn>
          </div>
        </div>
      </section>
    </>
  );
}
