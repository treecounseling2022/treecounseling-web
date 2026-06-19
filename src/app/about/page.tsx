import type { Metadata } from "next";
import FadeIn from "@/components/ui/FadeIn";
import ScrollDivider from "@/components/ui/ScrollDivider";
import { SwayingFlower, SproutVine, BloomingWildflower, ClimbingIvy, LushFern, MonsteraLeaf, BerryBranch, WeepingWillow } from "@/components/ui/VibrantPlants";
import { VALUES } from "@/lib/data";
import Link from "next/link";
import { CONTACT } from "@/lib/data";

export const metadata: Metadata = {
  title: "關於我們",
  description:
    "了解樹心理工作室的故事、使命、願景與核心團隊。成立於2022年，植根澳門，提供專業且溫暖的心理輔導服務。",
};

export default function AboutPage() {
  return (
    <div className="relative w-full overflow-hidden bg-background">
      {/* 頁面級全景水墨背景層 (z-0, opacity-5, 30秒慢生長) */}
      
      {/* 1. 右上水墨銀杏 (Header 右側背景) */}
      <ClimbingIvy className="absolute right-0 top-[120px] w-[300px] h-[450px] sm:w-[400px] sm:h-[600px] opacity-5 z-0 pointer-events-none" variant="autumn" />
      
      {/* 2. 左下水墨芭蕉大葉 (跨越故事與理念背景) */}
      <MonsteraLeaf className="absolute left-[2%] top-[680px] w-[320px] h-[320px] sm:w-[450px] sm:h-[450px] opacity-5 z-0 pointer-events-none" variant="warm" />
      
      {/* 3. 右側水墨蕨類 (跨越理念與使命背景) */}
      <LushFern className="absolute right-[2%] top-[1350px] w-[260px] h-[450px] sm:w-[350px] sm:h-[600px] opacity-5 z-0 pointer-events-none" mirror={true} variant="cool" />
      
      {/* 4. 左側水墨禪竹 (Timeline 背景) */}
      <SproutVine className="absolute left-[2%] top-[1950px] w-[280px] h-[450px] sm:w-[380px] sm:h-[600px] opacity-5 z-0 pointer-events-none" variant="forest" />
      
      {/* 5. 右下水墨垂柳 (CTA 背景) */}
      <WeepingWillow className="absolute right-0 top-[2450px] w-[280px] h-[450px] sm:w-[380px] sm:h-[600px] opacity-5 z-0 pointer-events-none" variant="default" />

      {/* 前景內容層 (z-10, bg-transparent) */}
      <div className="relative z-10 bg-transparent">
        
        {/* Page Header */}
        <section className="bg-transparent pt-36 pb-16 relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <FadeIn>
              <p className="text-xs font-sans tracking-widest text-sand uppercase mb-4">
                About
              </p>
              <h1 className="font-serif text-deep text-4xl md:text-5xl leading-tight tracking-wide">
                關於樹心理工作室
              </h1>
            </FadeIn>
          </div>
        </section>

        {/* Brand Story */}
        <section className="bg-transparent py-20 md:py-28 relative overflow-hidden">
          <ScrollDivider className="absolute top-0 left-0" />
          
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
              <FadeIn direction="left" className="space-y-6">
                <h2 className="font-serif text-deep text-2xl md:text-3xl leading-snug">
                  以「樹」之名
                </h2>
                <div className="space-y-5 font-sans text-muted text-base leading-relaxed">
                  <p>
                    因為我們認為且相信人與樹十分相似——我們的成長都會經歷各式各樣的困難與挑戰，
                    即使被困擾壓縮得只剩下裂縫的喘息空間，我們也可以展現出強大的生命力，
                    更可以成為令人敬畏的生命。
                  </p>
                  <p>
                    樹心理工作室成立於2022年，是澳門鮮少的以專業心理輔導為主要服務的私營單位。
                    我們希望將專業心理輔導文化植根於澳門，讓市民有更多的選擇及更具品質的心理輔導服務。
                  </p>
                </div>
              </FadeIn>

              <FadeIn direction="right" delay={150}>
                <div className="bg-soft/60 backdrop-blur-xs p-8 border-l-2 border-sand">
                  <p className="font-garamond text-sand text-lg italic mb-4">
                    &ldquo;逆境是根的養分，讓你更具生命力&rdquo;
                  </p>
                  <div className="space-y-4 font-sans text-muted text-sm leading-relaxed">
                    <p>
                      在澳門，我們看到情緒問題等日益嚴重，也清楚明白到市民對心理健康服務的需求。
                      與此同時，澳門心理輔導的認受性、專業性和重要性仍處於萌芽階段。
                    </p>
                    <p>
                      故希望把外地深造和實務經驗帶回澳門，在澳門提供更高品質的輔導服務，
                      亦希望讓市民和專業同行多一個選項。
                    </p>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="bg-transparent py-20 md:py-28 relative overflow-hidden">
          <ScrollDivider className="absolute top-0 left-0" />
          
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <FadeIn>
              <p className="text-xs font-sans tracking-widest text-sand uppercase mb-4">經營理念</p>
              <h2 className="font-serif text-deep text-2xl md:text-3xl mb-16">
                樹心靈根基，茁壯人生之樹
              </h2>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              {VALUES.map((v, i) => (
                <FadeIn key={v.number} delay={i * 100} direction="up">
                  <div className="space-y-3 pb-6 border-b border-sand/15 h-full flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-baseline gap-2">
                        <span className="font-garamond text-sand text-lg font-light">{v.number}</span>
                        <h3 className="font-serif text-deep text-lg">{v.title}</h3>
                      </div>
                      <p className="font-sans text-muted text-sm leading-relaxed">{v.description}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Mission / Vision / Values */}
        <section className="bg-soft/40 py-20 md:py-28 relative overflow-hidden">
          <ScrollDivider className="absolute top-0 left-0" />
          
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                {
                  num: "01",
                  title: "我們的使命",
                  text: "推廣心理輔導文化，以提升大眾對心理健康的認識；創造更具品質的心理輔導環境，讓每個人都能在關愛和支持中成長。",
                },
                {
                  num: "02",
                  title: "我們的願景",
                  text: "願成為可以讓大家信賴的心理輔導品牌。不但提供心理專業服務，亦期待在個人、家人、社會、教育及教學上作出貢獻。",
                },
                {
                  num: "03",
                  title: "我們的價值",
                  text: "真誠、熱誠、志誠。以真誠對待每一個人，以熱誠提供優質服務，以志誠推動心理健康。",
                },
              ].map((item, i) => (
                <FadeIn key={item.num} delay={i * 100} direction="up">
                  <div className="h-full">
                    <span className="font-garamond text-sand text-3xl block mb-4">{item.num}</span>
                    <h3 className="font-serif text-deep text-xl mb-4">{item.title}</h3>
                    <p className="font-sans text-muted text-sm leading-relaxed">{item.text}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Our Story - timeline */}
        <section className="bg-transparent py-20 md:py-28 relative overflow-hidden">
          <ScrollDivider className="absolute top-0 left-0" />
          
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="max-w-2xl space-y-8">
              <FadeIn>
                <p className="text-xs font-sans tracking-widest text-sand uppercase mb-4">我們的故事</p>
                <h2 className="font-serif text-deep text-2xl md:text-3xl mb-8">從這個房間開始</h2>
              </FadeIn>
              <FadeIn delay={100}>
                <div className="space-y-6 font-sans text-muted text-base leading-relaxed">
                  <p>
                    從2022年開始正式營運。幸得大家對於我們的專業信任和支持，我們撐過了疫情。
                  </p>
                  <p>
                    在過去數年，我們除了提供個人心理輔導服務外，還與數間企業提供心理相關服務，
                    亦為非牟利社團進行演講與工作坊。
                  </p>
                  <p>
                    同時擔任澳門聖若瑟大學輔導與心理療法碩士課程的實習單位，
                    並為實習生提供專業方面及行政方面督導。
                  </p>
                  <p className="text-deep font-medium">待續。</p>
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
