"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import FadeIn from "@/components/ui/FadeIn";


export default function HomeHero() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [showMist, setShowMist] = useState(true);

  // 監聽滾輪、觸控、鍵盤：在雲霧消散前鎖定網頁滾動
  useEffect(() => {
    if (!showMist) return;

    const triggerScroll = () => {
      if (!hasScrolled) setHasScrolled(true);
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) triggerScroll();
      if (showMist) e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowDown", "Space", "PageDown"].includes(e.code)) {
        triggerScroll();
      }
    };

    let startY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const diffY = startY - e.touches[0].clientY;
      if (diffY > 8) triggerScroll();
      if (showMist) e.preventDefault();
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [hasScrolled, showMist]);

  // 觸發後 2.2 秒完全移除 DOM，解鎖滾動 (配合 globals.css 的 2.2s 動畫)
  useEffect(() => {
    if (hasScrolled) {
      const timer = setTimeout(() => {
        setShowMist(false);
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [hasScrolled]);

  return (
    <section className="relative min-h-screen flex items-center bg-transparent pt-24 overflow-hidden">
      
      {/* Scroll-locked Mist Parting Overlay */}
      {showMist && (
        <div 
          className={cn(
            "fixed inset-0 z-40 overflow-hidden pointer-events-none select-none transition-all duration-[1800ms] ease-out",
            hasScrolled ? "bg-transparent" : "bg-paper/70" // 調濃至 70% 不透明度，使背景明顯朦朧
          )}
        >
          
          {/* Scroll Guide Indicator - fades out when scroll starts */}
          {!hasScrolled && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-auto">
              <div className="animate-float-warm flex flex-col items-center gap-2">
                <span className="font-serif text-forest text-xl sm:text-3xl tracking-[6px] pl-1 opacity-70">
                  歡迎來到 樹心理工作室
                </span>
                <svg
                  className="w-4 h-4 text-forest opacity-50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
                <button
                  onClick={() => setHasScrolled(true)}
                  className="mt-4 text-[11px] font-sans text-forest/50 hover:text-forest/80 border border-forest/20 hover:border-forest/40 px-3 py-1 transition-colors cursor-pointer"
                >
                  跳過動畫
                </button>
              </div>
            </div>
          )}

          {/* Center soft mist buffer */}
          <div className={cn(
            "absolute inset-0 m-auto w-96 h-96 text-paper flex items-center justify-center transition-all",
            hasScrolled ? "animate-mist-center" : "scale-100 opacity-90"
          )}>
            <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full scale-150">
              <circle cx="50" cy="50" r="35" opacity="0.6" />
              <circle cx="35" cy="45" r="25" opacity="0.45" />
              <circle cx="65" cy="55" r="25" opacity="0.45" />
            </svg>
          </div>

          {/* Left giant cloud mask */}
          <div className={cn(
            "absolute inset-y-0 left-0 w-[65%] text-paper flex items-center justify-end transition-all",
            hasScrolled ? "animate-mist-left" : "translate-x-0 opacity-80"
          )}>
            <svg viewBox="0 0 120 100" fill="currentColor" className="h-[150%] w-[130%] -mr-24 flex-shrink-0">
              <path d="M0,0 L90,0 C105,25 85,55 105,75 C115,85 95,100 0,100 Z" opacity="0.65" />
              <circle cx="90" cy="25" r="25" opacity="0.6" />
              <circle cx="95" cy="50" r="28" opacity="0.6" />
              <circle cx="85" cy="78" r="22" opacity="0.6" />
            </svg>
          </div>

          {/* Right giant cloud mask */}
          <div className={cn(
            "absolute inset-y-0 right-0 w-[65%] text-paper flex items-center justify-start transition-all",
            hasScrolled ? "animate-mist-right" : "translate-x-0 opacity-80",
            "scale-x-[-1]"
          )}>
            <svg viewBox="0 0 120 100" fill="currentColor" className="h-[150%] w-[130%] -ml-24 flex-shrink-0">
              <path d="M0,0 L90,0 C105,25 85,55 105,75 C115,85 95,100 0,100 Z" opacity="0.65" />
              <circle cx="90" cy="25" r="25" opacity="0.6" />
              <circle cx="95" cy="50" r="28" opacity="0.6" />
              <circle cx="85" cy="78" r="22" opacity="0.6" />
            </svg>
          </div>
        </div>
      )}

      {/* Background Japanese-style clouds (directly inspired by kimono-benntenn.com) */}
      {/* Cloud 1 - Top Left */}
      <div className="absolute top-28 left-[10%] w-32 h-16 text-sand/20 animate-cloud-float pointer-events-none z-0">
        <svg viewBox="0 0 100 50" fill="currentColor">
          <path d="M20,30 Q10,25 15,15 Q10,5 25,5 Q35,-3 50,5 Q65,-3 75,5 Q90,5 85,15 Q90,25 80,30 Z" />
        </svg>
      </div>

      {/* Cloud 2 - Top Right */}
      <div className="absolute top-44 right-[15%] w-40 h-20 text-sand/15 animate-cloud-float pointer-events-none z-0" style={{ animationDelay: "4s" }}>
        <svg viewBox="0 0 100 50" fill="currentColor">
          <path d="M20,30 Q10,25 15,15 Q10,5 25,5 Q35,-3 50,5 Q65,-3 75,5 Q90,5 85,15 Q90,25 80,30 Z" />
        </svg>
      </div>

      {/* Cloud 3 - Bottom Right */}
      <div className="absolute bottom-20 right-[30%] w-28 h-12 text-sand/10 animate-cloud-float pointer-events-none z-0" style={{ animationDelay: "8s" }}>
        <svg viewBox="0 0 100 50" fill="currentColor">
          <path d="M20,30 Q10,25 15,15 Q10,5 25,5 Q35,-3 50,5 Q65,-3 75,5 Q90,5 85,15 Q90,25 80,30 Z" />
        </svg>
      </div>

      {/* Hand-drawn Pine Tree outline - Bottom Left corner (kimono-benntenn style) */}
      <div 
        className="absolute left-0 bottom-0 w-48 sm:w-64 h-80 sm:h-96 text-forest/10 animate-plant-sway pointer-events-none z-0" 
        style={{ transformOrigin: "bottom left" }}
      >
        <svg viewBox="0 0 120 180" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-full h-full">
          {/* Main trunk */}
          <path d="M5,180 Q25,140 30,100 Q35,60 20,20" strokeLinecap="round" />
          <path d="M12,180 Q30,145 35,100" strokeLinecap="round" />
          
          {/* Branches */}
          <path d="M24,120 Q50,105 75,115" strokeLinecap="round" />
          <path d="M28,85 Q60,75 85,90" strokeLinecap="round" />
          <path d="M26,55 Q55,42 70,60" strokeLinecap="round" />
          
          {/* Pine needles clusters (styled clouds) */}
          <path d="M55,105 Q45,95 65,90 Q85,95 75,105 Q85,115 65,120 Q45,115 55,105 Z" fill="currentColor" fillOpacity="0.08" />
          <path d="M65,78 Q55,68 75,63 Q95,68 85,78 Q95,88 75,93 Q55,88 65,78 Z" fill="currentColor" fillOpacity="0.08" />
          <path d="M52,50 Q42,40 60,35 Q78,40 70,50 Q78,60 60,65 Q42,60 52,50 Z" fill="currentColor" fillOpacity="0.08" />
        </svg>
      </div>

      {/* Decorative Pine Branch - Bottom Right corner */}
      <div 
        className="absolute right-0 bottom-0 w-36 sm:w-48 h-64 sm:h-80 text-forest/8 animate-plant-sway pointer-events-none z-0" 
        style={{ transformOrigin: "bottom right", animationDelay: "2s" }}
      >
        <svg viewBox="0 0 100 150" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-full h-full">
          <path d="M95,150 Q75,110 70,70 Q65,30 80,10" strokeLinecap="round" />
          <path d="M73,90 Q45,80 25,95" strokeLinecap="round" />
          <path d="M72,60 Q50,45 30,65" strokeLinecap="round" />
          <path d="M30,85 Q15,75 35,70 Q55,75 30,85 Z" fill="currentColor" fillOpacity="0.07" />
          <path d="M35,55 Q20,45 40,40 Q60,45 35,55 Z" fill="currentColor" fillOpacity="0.07" />
        </svg>
      </div>



      {/* Main Content Layout */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 w-full grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
        
        {/* Left: Text, Letter Header style */}
        <div className="md:col-span-6 space-y-10">
          <FadeIn direction="up">
            <div className="space-y-4">
              <p className="text-xs font-sans tracking-widest text-sand uppercase">
                Tree Counseling Studio
              </p>
              <div className="w-8 h-px bg-sand/40" />
            </div>
          </FadeIn>

          <FadeIn direction="up" delay={150}>
            <h1 className="font-serif text-deep text-4xl sm:text-5xl md:text-6xl leading-tight tracking-wide">
              逆境是根的養分，
              <br />
              <span className="text-forest">讓你更具生命力。</span>
            </h1>
          </FadeIn>

          <FadeIn direction="up" delay={300}>
            <div className="max-w-md space-y-4 font-sans text-muted text-sm leading-relaxed">
              <p>
                你好。歡迎來到樹心理工作室。
              </p>
              <p>
                這裡是一個安全、保密且溫馨的空間，像是一封寫給你的信，一個你可以卸下防備、放慢腳步的角落。
                我們相信每個人都有如樹木般的生命力，即使在風雨中，也能在年輪深處積蓄向下扎根的堅韌養分。
              </p>
            </div>
          </FadeIn>

          <FadeIn direction="up" delay={450}>
            <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center pt-4">
              <Link
                href="/booking"
                className="text-sm font-sans text-forest hover:text-deep transition-all border-b border-forest/30 hover:border-forest pb-1 tracking-wider cursor-pointer"
              >
                開始預約諮商輔導 →
              </Link>
              <Link
                href="/services"
                className="text-sm font-sans text-muted hover:text-deep transition-all border-b border-muted/20 hover:border-deep pb-1 tracking-wider cursor-pointer"
              >
                了解我們如何陪伴你
              </Link>
            </div>
          </FadeIn>
        </div>

        {/* Center: Vertical Japanese-Style Poetic text (kimono-benntenn core feature) */}
        <div className="hidden md:flex md:col-span-2 justify-center">
          <FadeIn direction="none" delay={300}>
            <div className="h-72 border-l border-sand/30 pl-6 py-2 select-none pointer-events-none" style={{ writingMode: "vertical-rl" }}>
              <p className="font-serif text-sand text-[13px] tracking-[6px] leading-relaxed">
                不需要什麼特別的理由。
              </p>
              <p className="font-serif text-deep/40 text-[13px] tracking-[6px] leading-relaxed mt-4">
                在這裡，你只是一棵正在聽風的樹。
              </p>
            </div>
          </FadeIn>
        </div>

        {/* Right: Large elegant Ring graphic with swaying plant branch */}
        <div className="md:col-span-4 flex justify-center md:justify-end">
          <FadeIn direction="none" delay={200} className="relative w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80">
            {/* Animated Ring Stamp */}
            <svg
              viewBox="0 0 120 120"
              className="w-full h-full text-forest opacity-45"
              style={{ transformOrigin: "center" }}
              aria-hidden="true"
            >
              <path
                d="M60 10 A 50 50 0 1 1 100 100"
                stroke="currentColor"
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
                className="animate-ring-draw"
              />
              <path
                d="M60 20 A 40 40 0 1 1 92 92"
                stroke="currentColor"
                strokeWidth="1.1"
                fill="none"
                strokeLinecap="round"
                className="animate-ring-draw"
                style={{ animationDelay: "200ms" }}
              />
              <path
                d="M60 30 A 30 30 0 1 1 84 84"
                stroke="currentColor"
                strokeWidth="1.0"
                fill="none"
                strokeLinecap="round"
                className="animate-ring-draw"
                style={{ animationDelay: "400ms" }}
              />
              <path
                d="M60 40 A 20 20 0 1 1 76 76"
                stroke="currentColor"
                strokeWidth="0.9"
                fill="none"
                strokeLinecap="round"
                className="animate-ring-draw"
                style={{ animationDelay: "600ms" }}
              />
              <path
                d="M60 50 A 10 10 0 1 1 68 68"
                stroke="currentColor"
                strokeWidth="0.8"
                fill="none"
                strokeLinecap="round"
                className="animate-ring-draw"
                style={{ animationDelay: "800ms" }}
              />
              <circle cx="60" cy="60" r="1.5" fill="currentColor" />
            </svg>

            {/* Decorative wind-swaying plant branch (overlaid on top of ring) */}
            <div
              className="absolute -bottom-4 -left-4 w-32 h-32 text-forest/20 animate-plant-sway"
              style={{ transformOrigin: "bottom left" }}
            >
              <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M10,90 Q40,65 50,15" strokeLinecap="round" />
                {/* Leaf 1 */}
                <path d="M30,70 Q20,53 35,48 Q45,58 30,70 Z" fill="currentColor" fillOpacity="0.15" />
                {/* Leaf 2 */}
                <path d="M40,48 Q55,38 48,25 Q35,35 40,48 Z" fill="currentColor" fillOpacity="0.15" />
                {/* Leaf 3 */}
                <path d="M48,22 Q60,18 53,8 Q45,13 48,22 Z" fill="currentColor" fillOpacity="0.15" />
              </svg>
            </div>

            {/* Inner text overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <span className="font-serif text-[11px] text-deep/30 tracking-[4px] uppercase mb-1">
                Tree Studio
              </span>
              <span className="font-garamond text-[8px] text-sand/40 tracking-[2px]">
                EST. 2022
              </span>
            </div>
          </FadeIn>
        </div>
      </div>

      {/* Subtle bottom page indicator */}
      <div className="absolute bottom-10 left-6 right-6 flex justify-between items-center text-[10px] font-sans text-muted/30 uppercase tracking-widest z-10 pointer-events-none">
        <span>Macau</span>
        <div className="flex items-center gap-2">
          <span>Scroll down</span>
          <div className="w-8 h-px bg-sand/30" />
        </div>
      </div>
    </section>
  );
}
