import HomeHero from "@/components/sections/HomeHero";
import HomeIntro from "@/components/sections/HomeIntro";
import HomeServices from "@/components/sections/HomeServices";
import HomeNews from "@/components/sections/HomeNews";
import HomeCTA from "@/components/sections/HomeCTA";
import { VibrantTreeCrown } from "@/components/ui/VibrantPlants";

export default function HomePage() {
  return (
    <div className="relative w-full overflow-hidden bg-background isolate">
      {/* 頁面級全景水墨背景層 (z-[-1], 超低不透明度，巨大，30秒緩慢發芽) */}
      
      {/* 頁尾水墨生命樹 (從底部長出，向上穿透 CTA 與最新消息等區塊，且完全置於背景) */}
      <VibrantTreeCrown 
        className="absolute left-1/2 -translate-x-1/2 bottom-[-80px] sm:bottom-[-110px] lg:bottom-[-135px] w-[800px] h-auto aspect-[12/11] sm:w-[1400px] lg:w-[2000px] opacity-[0.04] z-[-1] pointer-events-none origin-bottom" 
        variant="default" 
      />

      {/* 前景內容區 (z-10 透明層) */}
      <div className="relative z-10 bg-transparent">
        <HomeHero />
        <HomeIntro />
        <HomeServices />
        <HomeNews />
        <HomeCTA />
      </div>
    </div>
  );
}
