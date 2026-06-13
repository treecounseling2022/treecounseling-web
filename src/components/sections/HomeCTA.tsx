import Link from "next/link";
import FadeIn from "@/components/ui/FadeIn";
import ScrollDivider from "@/components/ui/ScrollDivider";

export default function HomeCTA() {
  return (
    <section className="bg-transparent py-24 md:py-36 relative overflow-hidden">
      <ScrollDivider className="absolute top-0 left-0" />
      
      {/* Decorative subtle ring seal at the end of the letter */}
      <div className="absolute right-10 bottom-10 opacity-5 pointer-events-none">
        <svg className="animate-[spin_40s_linear_infinite]" width="200" height="200" viewBox="0 0 120 120" fill="none" stroke="#3a4a3a" strokeWidth="0.8" xmlns="http://www.w3.org/2000/svg">
          {[50, 40, 30, 20, 10].map((r) => (
            <circle key={r} cx="60" cy="60" r={r} strokeDasharray="4 4" />
          ))}
        </svg>
      </div>

      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <div className="max-w-xl mx-auto space-y-10">
          <FadeIn className="space-y-6">
            <p className="text-xs font-sans tracking-widest text-sand uppercase">
              Letter Conclusion
            </p>
            <h2 className="font-serif text-deep text-3xl md:text-4xl leading-tight">
              這封信即將結束，
              <br />
              但我們的陪伴才剛要開始。
            </h2>
            <p className="font-sans text-muted text-sm leading-relaxed max-w-md mx-auto">
              當你感覺準備好了，歡迎你寫下第一頁信紙。
              不論你正面臨怎樣的考驗，這裡都會有雙溫慢的手，陪你一起向下扎根，向著光亮生長。
            </p>
          </FadeIn>

          <FadeIn delay={200} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link
                href="/booking"
                className="inline-flex items-center px-8 py-3.5 bg-forest text-paper text-sm font-sans tracking-wide hover:bg-deep transition-all cursor-pointer"
              >
                前往填寫預約表單
              </Link>
              <a
                href="https://wa.me/85362772234"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-sans text-muted hover:text-forest transition-colors link-underline pb-0.5 cursor-pointer"
              >
                透過 WhatsApp 聯絡行政查詢 →
              </a>
            </div>
            <p className="text-[10px] font-sans text-muted/40">
              所有填寫的資料皆以專業倫理標準嚴格保密，請安心填寫。
            </p>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
