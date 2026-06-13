"use client";

import { cn } from "@/lib/utils";
import { useId } from "react";

export interface PlantProps {
  className?: string;
  style?: React.CSSProperties;
  mirror?: boolean;
  variant?: "default" | "warm" | "cool" | "autumn" | "forest";
}

export interface SumiColors {
  ink: string;       // 主墨色 (濃墨/深灰)
  wash1: string;     // 淡墨色 (灰綠/淺墨)
  wash2: string;     // 點綴淡彩 (赭石/花青/藤黃)
  bgOverlay: string; // 用於淡化邊界的透明色
}

// 日式水墨傳統色系：墨黑、花青(墨藍)、赭石(泥土褐)、藤黃(淡暖黃)、松花(淡灰綠)
const getSumiColors = (variant: string = "default"): SumiColors => {
  switch (variant) {
    case "warm": // 赭石暖調水墨
      return {
        ink: "#2d2621",       // 帶暖意的焦墨
        wash1: "#5c4f46",     // 暖淡墨
        wash2: "#8d6e63",     // 赭石色
        bgOverlay: "rgba(141, 110, 99, 0.08)"
      };
    case "cool": // 花青冷調水墨
      return {
        ink: "#1c2833",       // 帶藍調的黛墨
        wash1: "#34495e",     // 花青淡墨
        wash2: "#5d6d7e",     // 灰藍黛色
        bgOverlay: "rgba(93, 109, 126, 0.08)"
      };
    case "autumn": // 枯筆秋意水墨
      return {
        ink: "#3e2723",       // 枯褐墨
        wash1: "#5d4037",     // 焦褐淡墨
        wash2: "#a1887f",     // 枯葉灰
        bgOverlay: "rgba(161, 136, 127, 0.08)"
      };
    case "forest": // 松煙竹影水墨
      return {
        ink: "#192219",       // 松煙濃墨
        wash1: "#2d3b2d",     // 竹葉深綠墨
        wash2: "#5c6e58",     // 淡淡松花綠
        bgOverlay: "rgba(92, 110, 88, 0.08)"
      };
    default: // default: 自然水墨
      return {
        ink: "#222a27",       // 標準主墨
        wash1: "#47524e",     // 標準淡墨
        wash2: "#6b7c75",     // 清雅青墨
        bgOverlay: "rgba(107, 124, 117, 0.08)"
      };
  }
};

// 1. 水墨寫意荷花 (SumiLotus) - 替代 SwayingFlower
export function SwayingFlower({ className, style, mirror, variant = "default" }: PlantProps) {
  const c = getSumiColors(variant);
  const rawId = useId();
  const id = rawId.replace(/:/g, "");
  
  return (
    <div 
      className={cn(
        "animate-sumi-bleed origin-bottom select-none pointer-events-none", 
        mirror && "scale-x-[-1]", 
        className
      )}
      style={style}
    >
      <div className="w-full h-full animate-plant-sway origin-bottom">
        <svg viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
          <defs>
            {/* 宣紙滲墨與毛筆飛白粗糙邊緣濾鏡 */}
            <filter id={`sumi-ink-${id}`} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced" />
              <feGaussianBlur in="displaced" stdDeviation="0.6" result="blurred" />
              <feMerge>
                <feMergeNode in="blurred" />
                <feMergeNode in="displaced" />
              </feMerge>
            </filter>
          </defs>

          {/* 寫意荷梗 */}
          <g filter={`url(#sumi-ink-${id})`}>
            <path d="M60 150 Q63 90 48 40 Q44 26 50 15" stroke={c.ink} strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
            <path d="M57 95 Q38 88 28 75" stroke={c.ink} strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />

            {/* 寫意大荷葉 */}
            <path 
              d="M28 75 C10 70 -2 52 14 42 C30 32 40 55 28 75 Z" 
              fill={c.wash1} 
              fillOpacity="0.15"
              stroke={c.ink} 
              strokeWidth="0.8" 
              strokeOpacity="0.2"
              className="animate-leaf-flutter origin-[28px_75px]" 
            />

            {/* 荷梗上的小水墨點 */}
            <circle cx="58" cy="115" r="1" fill={c.ink} opacity="0.4" />
            <circle cx="56" cy="98" r="1.2" fill={c.ink} opacity="0.4" />
            <circle cx="52" cy="70" r="1" fill={c.ink} opacity="0.4" />

            {/* 頂端含苞水墨荷蕾 */}
            <g className="animate-[pulse_4.5s_ease-in-out_infinite] origin-[50px_15px]">
              <path d="M50 15 C40 12, 38 -2, 50 -2 C62 -2, 60 12, 50 15 Z" fill={c.wash2} fillOpacity="0.2" stroke={c.ink} strokeWidth="0.6" strokeOpacity="0.25" />
              <path d="M50 15 C58 8, 68 12, 58 22 C48 32, 42 20, 50 15 Z" fill={c.wash2} fillOpacity="0.15" />
              <path d="M50 15 C42 8, 32 12, 42 22 C52 32, 58 20, 50 15 Z" fill={c.wash2} fillOpacity="0.15" />
              <circle cx="50" cy="8" r="2.5" fill={c.ink} opacity="0.25" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

// 2. 水墨禪竹 (SumiBamboo) - 替代 SproutVine
export function SproutVine({ className, style, mirror, variant = "default" }: PlantProps) {
  const c = getSumiColors(variant);
  const rawId = useId();
  const id = rawId.replace(/:/g, "");

  return (
    <div 
      className={cn(
        "animate-sumi-bleed origin-bottom select-none pointer-events-none", 
        mirror && "scale-x-[-1]", 
        className
      )}
      style={style}
    >
      <div className="w-full h-full animate-plant-sway origin-bottom-left">
        <svg viewBox="0 0 100 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
          <defs>
            <filter id={`sumi-ink-${id}`} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced" />
              <feGaussianBlur in="displaced" stdDeviation="0.6" result="blurred" />
              <feMerge>
                <feMergeNode in="blurred" />
                <feMergeNode in="displaced" />
              </feMerge>
            </filter>
          </defs>

          {/* 水墨竹節 */}
          <g filter={`url(#sumi-ink-${id})`} opacity="0.3">
            <path d="M20 180 L22 135" stroke={c.ink} strokeWidth="3.2" strokeLinecap="round" />
            <circle cx="21" cy="135" r="2" fill={c.ink} />
            
            <path d="M21.5 133 L24 88" stroke={c.ink} strokeWidth="2.8" strokeLinecap="round" />
            <circle cx="23" cy="88" r="1.8" fill={c.ink} />

            <path d="M23.5 86 L28 42" stroke={c.ink} strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="26" cy="42" r="1.5" fill={c.ink} />

            <path d="M27.5 40 Q35 25 38 12" stroke={c.ink} strokeWidth="1.5" strokeLinecap="round" />

            <path d="M21 135 Q38 130 46 122" stroke={c.ink} strokeWidth="1" strokeLinecap="round" />
            <path d="M23 88 Q8 82 2 72" stroke={c.ink} strokeWidth="1" strokeLinecap="round" />
            <path d="M26 42 Q42 38 48 26" stroke={c.ink} strokeWidth="1" strokeLinecap="round" />
          </g>

          {/* 竹葉 */}
          <g filter={`url(#sumi-ink-${id})`}>
            <path 
              d="M46 122 C55 125, 68 118, 55 110 C46 105, 48 115, 46 122 Z" 
              fill={c.wash1} fillOpacity="0.18" stroke={c.ink} strokeWidth="0.5" strokeOpacity="0.15"
              className="animate-leaf-flutter origin-[46px_122px]"
            />
            <path 
              d="M46 122 C58 132, 66 130, 52 124 C44 120, 46 121, 46 122 Z" 
              fill={c.wash2} fillOpacity="0.15"
              className="animate-leaf-flutter origin-[46px_122px]"
              style={{ animationDelay: "0.5s" }}
            />

            <path 
              d="M2 72 C-10 68, -12 55, -2 52 C5 50, 2 62, 2 72 Z" 
              fill={c.wash1} fillOpacity="0.18" stroke={c.ink} strokeWidth="0.5" strokeOpacity="0.15"
              className="animate-leaf-flutter origin-[2px_72px]"
              style={{ animationDelay: "1s" }}
            />
            <path 
              d="M2 72 C-8 80, -5 85, 4 78 C8 74, 4 74, 2 72 Z" 
              fill={c.wash2} fillOpacity="0.15"
              className="animate-leaf-flutter origin-[2px_72px]"
              style={{ animationDelay: "1.5s" }}
            />

            <path 
              d="M48 26 C62 25, 68 15, 54 12 C44 10, 46 20, 48 26 Z" 
              fill={c.wash1} fillOpacity="0.18" stroke={c.ink} strokeWidth="0.5" strokeOpacity="0.15"
              className="animate-leaf-flutter origin-[48px_26px]"
              style={{ animationDelay: "2s" }}
            />
          </g>
        </svg>
      </div>
    </div>
  );
}

// 3. 水墨蒼木 (SumiTree) - 替代 VibrantTreeCrown
export function VibrantTreeCrown({ className, style, mirror, variant = "default" }: PlantProps) {
  const c = getSumiColors(variant);
  const rawId = useId();
  const id = rawId.replace(/:/g, "");

  return (
    <div 
      className={cn(
        "animate-sumi-bleed origin-bottom select-none pointer-events-none group/tree cursor-default", 
        mirror && "scale-x-[-1]", 
        className
      )}
      style={style}
    >
      <svg viewBox="0 0 120 110" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYBottom meet" className="w-full h-full overflow-visible">
        <defs>
          <filter id={`sumi-ink-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feGaussianBlur in="displaced" stdDeviation="0.6" result="blurred" />
            <feMerge>
              <feMergeNode in="blurred" />
              <feMergeNode in="displaced" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. 寫意泥土/大地 (位於樹幹底部 Y=100 處) — 保持靜止不隨風搖擺 */}
        <g filter={`url(#sumi-ink-${id})`}>
          {/* 泥土的淡墨暈染 */}
          <path 
            d="M10,100 C30,96, 50,104, 70,100 C90,96, 105,103, 110,100 C115,98, 95,106, 60,105 C25,104, 5,101, 10,100 Z" 
            fill={c.ink} 
            fillOpacity="0.45" 
          />
          {/* 泥土的寫意飛白細線 */}
          <path 
            d="M8,101 Q35,97 60,100 Q85,103 112,101" 
            stroke={c.ink} 
            strokeWidth="1.8" 
            strokeLinecap="round" 
            opacity="0.3" 
          />
        </g>

        {/* 2. 隨風搖曳的樹木本體 — 以樹根(60, 100)為軸心進行擺動動畫 */}
        <g className="animate-plant-sway" style={{ transformOrigin: "60px 100px" }}>
          {/* 左右發散的水墨古樹幹 */}
          <g filter={`url(#sumi-ink-${id})`} opacity="0.1">
            {/* 主幹 */}
            <path d="M60,100 Q58,80 60,65 Q62,58 58,50" stroke={c.ink} strokeWidth="3" strokeLinecap="round" />
            {/* 左大分枝 */}
            <path d="M60,85 Q45,78 35,70 Q25,65 20,55" stroke={c.ink} strokeWidth="2.2" strokeLinecap="round" />
            <path d="M35,70 Q22,72 14,62" stroke={c.ink} strokeWidth="1.2" strokeLinecap="round" />
            {/* 右大分枝 */}
            <path d="M60,75 Q75,70 85,62 Q96,55 92,45" stroke={c.ink} strokeWidth="2.2" strokeLinecap="round" />
            <path d="M85,62 Q100,62 106,52" stroke={c.ink} strokeWidth="1.2" strokeLinecap="round" />
          </g>

          {/* 左右舒展的點苔/樹冠 (利用多層大小圓做水墨渲染) */}
          <g filter={`url(#sumi-ink-${id})`}>
            {/* 中間主葉叢 */}
            <circle cx="60" cy="38" r="22" fill={c.wash1} fillOpacity="0.04" className="animate-[pulse_6s_ease-in-out_infinite]" />
            <circle cx="50" cy="32" r="15" fill={c.wash2} fillOpacity="0.04" className="animate-[pulse_3s_ease-in-out_infinite]" style={{ animationDelay: "0.5s" }} />
            
            {/* 左側發散葉叢 */}
            <circle cx="32" cy="46" r="18" fill={c.wash1} fillOpacity="0.05" className="animate-[pulse_5s_ease-in-out_infinite]" style={{ animationDelay: "1s" }} />
            <circle cx="15" cy="54" r="13" fill={c.wash2} fillOpacity="0.04" className="animate-[pulse_4s_ease-in-out_infinite]" style={{ animationDelay: "1.5s" }} />
            
            {/* 右側發散葉叢 */}
            <circle cx="88" cy="40" r="18" fill={c.wash1} fillOpacity="0.05" className="animate-[pulse_5s_ease-in-out_infinite]" style={{ animationDelay: "2s" }} />
            <circle cx="105" cy="46" r="13" fill={c.wash2} fillOpacity="0.04" className="animate-[pulse_4s_ease-in-out_infinite]" style={{ animationDelay: "2.5s" }} />
            
            {/* 頂部與其他點綴 */}
            <circle cx="72" cy="30" r="15" fill={c.wash2} fillOpacity="0.03" className="animate-[pulse_4s_ease-in-out_infinite]" style={{ animationDelay: "0.8s" }} />
            <circle cx="60" cy="24" r="10" fill={c.ink} fillOpacity="0.02" />
          </g>
        </g>
      </svg>
    </div>
  );
}

// 4. 水墨梅枝 (SumiPlum) - 替代 BloomingWildflower
export function BloomingWildflower({ className, style, mirror, variant = "default" }: PlantProps) {
  const c = getSumiColors(variant);
  const rawId = useId();
  const id = rawId.replace(/:/g, "");

  return (
    <div 
      className={cn(
        "animate-sumi-bleed origin-bottom select-none pointer-events-none", 
        mirror && "scale-x-[-1]", 
        className
      )}
      style={style}
    >
      <div className="w-full h-full animate-plant-sway origin-bottom">
        <svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
          <defs>
            <filter id={`sumi-ink-${id}`} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced" />
              <feGaussianBlur in="displaced" stdDeviation="0.6" result="blurred" />
              <feMerge>
                <feMergeNode in="blurred" />
                <feMergeNode in="displaced" />
              </feMerge>
            </filter>
          </defs>

          {/* 遒勁梅枝 */}
          <g filter={`url(#sumi-ink-${id})`} opacity="0.3">
            <path d="M50 120 Q52 75 42 45 L46 22" stroke={c.ink} strokeWidth="2.2" strokeLinecap="round" />
            <path d="M47 80 L62 70 L68 58" stroke={c.ink} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M44 55 L28 45" stroke={c.ink} strokeWidth="1.2" strokeLinecap="round" />
          </g>

          {/* 水墨圈梅 */}
          <g filter={`url(#sumi-ink-${id})`}>
            <g className="animate-[pulse_4s_ease-in-out_infinite] origin-[46px_22px]">
              <circle cx="40" cy="16" r="6.5" fill={c.wash2} fillOpacity="0.18" />
              <circle cx="52" cy="16" r="6.5" fill={c.wash2} fillOpacity="0.18" />
              <circle cx="46" cy="28" r="6.5" fill={c.wash2} fillOpacity="0.18" />
              <circle cx="46" cy="22" r="3" fill={c.ink} opacity="0.35" />
            </g>

            <g className="animate-[pulse_3s_ease-in-out_infinite] origin-[68px_58px]" style={{ animationDelay: "1.5s" }}>
              <circle cx="62" cy="52" r="5" fill={c.wash1} fillOpacity="0.18" />
              <circle cx="74" cy="52" r="5" fill={c.wash1} fillOpacity="0.18" />
              <circle cx="68" cy="64" r="5" fill={c.wash1} fillOpacity="0.18" />
              <circle cx="68" cy="58" r="2.5" fill={c.ink} opacity="0.3" />
            </g>

            <circle cx="28" cy="45" r="4.2" fill={c.wash2} fillOpacity="0.15" />
            <circle cx="28" cy="45" r="1.5" fill={c.ink} opacity="0.3" />
          </g>
        </svg>
      </div>
    </div>
  );
}

// 5. 金黃銀杏枝葉 (SumiGinkgo) - 替代 ClimbingIvy
export function ClimbingIvy({ className, style, mirror, variant = "default" }: PlantProps) {
  const c = getSumiColors(variant);
  const rawId = useId();
  const id = rawId.replace(/:/g, "");

  return (
    <div 
      className={cn(
        "animate-sumi-bleed origin-bottom select-none pointer-events-none", 
        mirror && "scale-x-[-1]", 
        className
      )}
      style={style}
    >
      <div className="w-full h-full animate-plant-sway origin-bottom">
        <svg viewBox="0 0 120 190" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
          <defs>
            <filter id={`sumi-ink-${id}`} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced" />
              <feGaussianBlur in="displaced" stdDeviation="0.6" result="blurred" />
              <feMerge>
                <feMergeNode in="blurred" />
                <feMergeNode in="displaced" />
              </feMerge>
            </filter>
          </defs>

          {/* 細緻水墨枝條 */}
          <g filter={`url(#sumi-ink-${id})`} opacity="0.25">
            <path d="M60 180 Q50 110 75 50 Q85 25 70 10" stroke={c.ink} strokeWidth="2.2" strokeLinecap="round" />
            <path d="M57 120 Q35 110 28 92" stroke={c.ink} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M66 80 Q90 70 95 52" stroke={c.ink} strokeWidth="1.5" strokeLinecap="round" />
          </g>

          {/* 扇形水墨銀杏葉 */}
          <g filter={`url(#sumi-ink-${id})`}>
            <path 
              d="M70 10 C62 -2 48 5 55 18 C62 25 70 18 70 10 Z" 
              fill={c.wash2} fillOpacity="0.18" stroke={c.ink} strokeWidth="0.6" strokeOpacity="0.15"
              className="animate-leaf-flutter origin-[70px_10px]"
            />
            <path 
              d="M95 52 C105 45 110 30 98 25 C88 22 88 40 95 52 Z" 
              fill={c.wash1} fillOpacity="0.18" stroke={c.ink} strokeWidth="0.6" strokeOpacity="0.15"
              className="animate-leaf-flutter origin-[95px_52px]"
              style={{ animationDelay: "0.5s" }}
            />
            <path 
              d="M28 92 C15 90 10 75 20 68 C30 63 32 80 28 92 Z" 
              fill={c.wash2} fillOpacity="0.18" stroke={c.ink} strokeWidth="0.6" strokeOpacity="0.15"
              className="animate-leaf-flutter origin-[28px_92px]"
              style={{ animationDelay: "1.1s" }}
            />
            <path 
              d="M72 100 C85 95 90 82 82 72 C74 65 70 85 72 100 Z" 
              fill={c.wash1} fillOpacity="0.15"
              className="animate-leaf-flutter origin-[72px_100px]"
              style={{ animationDelay: "1.7s" }}
            />
            <path 
              d="M48 135 C32 135 28 120 38 112 C48 105 52 120 48 135 Z" 
              fill={c.wash2} fillOpacity="0.15"
              className="animate-leaf-flutter origin-[48px_135px]"
              style={{ animationDelay: "2.3s" }}
            />
          </g>
        </svg>
      </div>
    </div>
  );
}

// 6. 水墨山蕨 (SumiFern) - 替代 LushFern
export function LushFern({ className, style, mirror, variant = "default" }: PlantProps) {
  const c = getSumiColors(variant);
  const rawId = useId();
  const id = rawId.replace(/:/g, "");

  return (
    <div 
      className={cn(
        "animate-sumi-bleed origin-bottom select-none pointer-events-none", 
        mirror && "scale-x-[-1]", 
        className
      )}
      style={style}
    >
      <div className="w-full h-full animate-plant-sway origin-bottom">
        <svg viewBox="0 0 110 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
          <defs>
            <filter id={`sumi-ink-${id}`} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced" />
              <feGaussianBlur in="displaced" stdDeviation="0.6" result="blurred" />
              <feMerge>
                <feMergeNode in="blurred" />
                <feMergeNode in="displaced" />
              </feMerge>
            </filter>
          </defs>

          {/* 主軸 */}
          <path d="M55 145 Q53 85 42 22" stroke={c.ink} strokeWidth="2.2" strokeLinecap="round" opacity="0.1" filter={`url(#sumi-ink-${id})`} />

          {/* 羽狀水墨葉片 */}
          <g filter={`url(#sumi-ink-${id})`}>
            <path d="M53 125 Q78 120 84 105 Q68 100 53 125 Z" fill={c.wash1} fillOpacity="0.05" stroke={c.ink} strokeWidth="0.5" strokeOpacity="0.04" className="animate-leaf-flutter origin-[53px_125px]" />
            <path d="M54 130 Q28 125 22 110 Q38 105 54 130 Z" fill={c.wash2} fillOpacity="0.04" stroke={c.ink} strokeWidth="0.5" strokeOpacity="0.04" className="animate-leaf-flutter origin-[54px_130px]" style={{ animationDelay: "0.3s" }} />

            <path d="M50 102 Q75 97 80 82 Q64 77 50 102 Z" fill={c.wash1} fillOpacity="0.05" stroke={c.ink} strokeWidth="0.5" strokeOpacity="0.04" className="animate-leaf-flutter origin-[50px_102px]" style={{ animationDelay: "0.6s" }} />
            <path d="M51 107 Q26 102 20 87 Q36 82 51 107 Z" fill={c.wash2} fillOpacity="0.04" stroke={c.ink} strokeWidth="0.5" strokeOpacity="0.04" className="animate-leaf-flutter origin-[51px_107px]" style={{ animationDelay: "0.9s" }} />

            <path d="M47 80 Q70 73 74 60 Q59 56 47 80 Z" fill={c.wash1} fillOpacity="0.04" className="animate-leaf-flutter origin-[47px_80px]" style={{ animationDelay: "1.2s" }} />
            <path d="M48 85 Q24 78 18 65 Q34 60 48 85 Z" fill={c.wash1} fillOpacity="0.04" className="animate-leaf-flutter origin-[48px_85px]" style={{ animationDelay: "1.5s" }} />

            <path d="M44 58 Q64 50 66 38 Q52 35 44 58 Z" fill={c.wash2} fillOpacity="0.04" className="animate-leaf-flutter origin-[44px_58px]" style={{ animationDelay: "1.8s" }} />
            <path d="M45 62 Q24 54 20 42 Q34 38 45 62 Z" fill={c.wash2} fillOpacity="0.04" className="animate-leaf-flutter origin-[45px_62px]" style={{ animationDelay: "2.1s" }} />

            <path d="M42 22 Q52 12 45 6 Q38 12 42 22 Z" fill={c.ink} fillOpacity="0.08" stroke={c.ink} strokeWidth="0.5" className="animate-pulse" />
          </g>
        </svg>
      </div>
    </div>
  );
}

// 7. 水墨寫意大芭蕉葉 (SumiBroadleaf) - 替代 MonsteraLeaf
export function MonsteraLeaf({ className, style, mirror, variant = "default" }: PlantProps) {
  const c = getSumiColors(variant);
  const rawId = useId();
  const id = rawId.replace(/:/g, "");

  return (
    <div 
      className={cn(
        "animate-sumi-bleed origin-bottom select-none pointer-events-none", 
        mirror && "scale-x-[-1]", 
        className
      )}
      style={style}
    >
      <div className="w-full h-full animate-plant-sway origin-bottom">
        <svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
          <defs>
            <filter id={`sumi-ink-${id}`} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced" />
              <feGaussianBlur in="displaced" stdDeviation="0.6" result="blurred" />
              <feMerge>
                <feMergeNode in="blurred" />
                <feMergeNode in="displaced" />
              </feMerge>
            </filter>
          </defs>

          {/* 寫意大芭蕉葉 */}
          <g filter={`url(#sumi-ink-${id})`}>
            <path d="M60 135 L60 80 Q60 40 52 15" stroke={c.ink} strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />

            <path 
              d="M 60 15 
                 C 48 8, 30 12, 22 26 
                 C 14 40, 16 65, 18 80 
                 C 20 95, 30 110, 48 112 
                 C 54 113, 58 115, 60 115 
                 C 62 115, 66 113, 72 112 
                 C 90 110, 100 95, 102 80 
                 C 104 65, 106 40, 98 26 
                 C 90 12, 72 8, 60 15 Z" 
              fill={c.wash1} 
              fillOpacity="0.12"
              stroke={c.ink} 
              strokeWidth="1" 
              strokeOpacity="0.18"
            />

            <path d="M60 40 Q45 42 32 46" stroke={c.ink} strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.15" />
            <path d="M60 68 Q42 70 28 78" stroke={c.ink} strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.15" />
            <path d="M60 92 Q46 95 34 102" stroke={c.ink} strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.15" />
            <path d="M60 40 Q75 42 88 46" stroke={c.ink} strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.15" />
            <path d="M60 68 Q78 70 92 78" stroke={c.ink} strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.15" />
            <path d="M60 92 Q74 95 86 102" stroke={c.ink} strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.15" />
          </g>
        </svg>
      </div>
    </div>
  );
}

// 8. 水墨漿果枝條 (SumiBerry) - 替代 BerryBranch
export function BerryBranch({ className, style, mirror, variant = "default" }: PlantProps) {
  const c = getSumiColors(variant);
  const rawId = useId();
  const id = rawId.replace(/:/g, "");

  return (
    <div 
      className={cn(
        "animate-sumi-bleed origin-bottom select-none pointer-events-none", 
        mirror && "scale-x-[-1]", 
        className
      )}
      style={style}
    >
      <div className="w-full h-full animate-plant-sway origin-bottom">
        <svg viewBox="0 0 100 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
          <defs>
            <filter id={`sumi-ink-${id}`} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced" />
              <feGaussianBlur in="displaced" stdDeviation="0.6" result="blurred" />
              <feMerge>
                <feMergeNode in="blurred" />
                <feMergeNode in="displaced" />
              </feMerge>
            </filter>
          </defs>

          {/* 主枝與側枝 */}
          <g filter={`url(#sumi-ink-${id})`} opacity="0.3">
            <path d="M50 140 Q55 90 40 40" stroke={c.ink} strokeWidth="2" strokeLinecap="round" />
            <path d="M51 105 Q30 95 20 85" stroke={c.ink} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M48 80 Q70 70 80 60" stroke={c.ink} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M44 55 Q25 45 22 30" stroke={c.ink} strokeWidth="1.2" strokeLinecap="round" />
          </g>

          {/* 水墨朱砂點苔漿果 */}
          <g filter={`url(#sumi-ink-${id})`}>
            <g className="animate-pulse">
              <circle cx="40" cy="40" r="7" fill={c.wash2} fillOpacity="0.22" stroke={c.ink} strokeWidth="0.5" strokeOpacity="0.2" />
              <circle cx="32" cy="32" r="5.5" fill={c.wash1} fillOpacity="0.22" stroke={c.ink} strokeWidth="0.5" strokeOpacity="0.2" style={{ animationDelay: "0.5s" }} />
              <circle cx="48" cy="30" r="6" fill={c.wash2} fillOpacity="0.18" style={{ animationDelay: "1s" }} />
            </g>

            <g className="animate-pulse" style={{ animationDelay: "0.3s" }}>
              <circle cx="20" cy="85" r="7.2" fill={c.wash1} fillOpacity="0.22" stroke={c.ink} strokeWidth="0.5" strokeOpacity="0.2" />
              <circle cx="11" cy="88" r="5.5" fill={c.wash2} fillOpacity="0.22" stroke={c.ink} strokeWidth="0.5" strokeOpacity="0.2" style={{ animationDelay: "0.8s" }} />
            </g>

            <g className="animate-pulse" style={{ animationDelay: "0.6s" }}>
              <circle cx="80" cy="60" r="6.8" fill={c.wash2} fillOpacity="0.2" />
              <circle cx="89" cy="56" r="5.8" fill={c.wash1} fillOpacity="0.2" style={{ animationDelay: "1.1s" }} />
              <circle cx="76" cy="50" r="5" fill={c.wash2} fillOpacity="0.15" style={{ animationDelay: "1.6s" }} />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

// 9. 水墨雨絲垂柳 (SumiWillow) - 替代 WeepingWillow
export function WeepingWillow({ className, style, mirror, variant = "default" }: PlantProps) {
  const c = getSumiColors(variant);
  const rawId = useId();
  const id = rawId.replace(/:/g, "");

  return (
    <div 
      className={cn(
        "animate-sumi-bleed origin-top select-none pointer-events-none", 
        mirror && "scale-x-[-1]", 
        className
      )}
      style={style}
    >
      <div className="w-full h-full animate-plant-sway origin-top">
        <svg viewBox="0 0 100 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
          <defs>
            <filter id={`sumi-ink-${id}`} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced" />
              <feGaussianBlur in="displaced" stdDeviation="0.6" result="blurred" />
              <feMerge>
                <feMergeNode in="blurred" />
                <feMergeNode in="displaced" />
              </feMerge>
            </filter>
          </defs>

          {/* 頂部柳枝 */}
          <path d="M5 12 Q55 5 95 28" stroke={c.ink} strokeWidth="2.2" strokeLinecap="round" opacity="0.25" filter={`url(#sumi-ink-${id})`} />

          {/* 垂絲三條 */}
          <g opacity="0.25" filter={`url(#sumi-ink-${id})`}>
            <path d="M30 14 Q20 60 25 120 Q28 150 22 170" stroke={c.ink} strokeWidth="1.2" strokeLinecap="round" />
            <path d="M55 12 Q50 70 58 130 Q62 160 55 175" stroke={c.ink} strokeWidth="1.2" strokeLinecap="round" />
            <path d="M78 19 Q82 60 74 110 Q68 140 72 165" stroke={c.ink} strokeWidth="1.2" strokeLinecap="round" />
          </g>

          {/* 淚滴柳葉 */}
          <g filter={`url(#sumi-ink-${id})`}>
            <path d="M28 35 C14 38 12 50 26 48 Z" fill={c.wash1} fillOpacity="0.15" stroke={c.ink} strokeWidth="0.5" strokeOpacity="0.1" className="animate-leaf-flutter origin-[28px_35px]" />
            <path d="M23 70 C34 73 36 85 22 83 Z" fill={c.wash2} fillOpacity="0.12" className="animate-leaf-flutter origin-[23px_70px]" style={{ animationDelay: "0.4s" }} />
            <path d="M26 110 C12 113 10 125 25 123 Z" fill={c.wash1} fillOpacity="0.12" className="animate-leaf-flutter origin-[26px_110px]" style={{ animationDelay: "0.8s" }} />

            <path d="M54 40 C66 43 68 55 53 53 Z" fill={c.wash2} fillOpacity="0.15" className="animate-leaf-flutter origin-[54px_40px]" style={{ animationDelay: "0.2s" }} />
            <path d="M52 80 C38 83 36 95 51 93 Z" fill={c.wash1} fillOpacity="0.12" className="animate-leaf-flutter origin-[52px_80px]" style={{ animationDelay: "0.6s" }} />
            <path d="M57 120 C69 123 71 135 56 133 Z" fill={c.wash2} fillOpacity="0.12" className="animate-leaf-flutter origin-[57px_120px]" style={{ animationDelay: "1.0s" }} />

            <path d="M80 45 C66 48 64 60 78 58 Z" fill={c.wash1} fillOpacity="0.15" className="animate-leaf-flutter origin-[80px_45px]" style={{ animationDelay: "0.3s" }} />
            <path d="M76 85 C88 88 90 100 75 98 Z" fill={c.wash2} fillOpacity="0.12" className="animate-leaf-flutter origin-[76px_85px]" style={{ animationDelay: "0.7s" }} />
          </g>
        </svg>
      </div>
    </div>
  );
}

// 10. 水墨山嵐雲嵐 (SumiMist) - 替代 ShrubBush
export function ShrubBush({ className, style, mirror, variant = "default" }: PlantProps) {
  const c = getSumiColors(variant);
  const rawId = useId();
  const id = rawId.replace(/:/g, "");

  return (
    <div 
      className={cn(
        "animate-sumi-bleed origin-bottom select-none pointer-events-none", 
        mirror && "scale-x-[-1]", 
        className
      )}
      style={style}
    >
      <div className="w-full h-full animate-[pulse_6s_ease-in-out_infinite] origin-bottom">
        <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
          <defs>
            <filter id={`sumi-mist-${id}`} x="-30%" y="-30%" width="160%" height="160%">
              <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" result="displaced" />
              <feGaussianBlur in="displaced" stdDeviation="2.2" />
            </filter>
          </defs>

          {/* 層層重疊的水墨山嵐 */}
          <g filter={`url(#sumi-mist-${id})`}>
            <path
              d="M10 95 C15 70, 30 50, 50 55 C65 42, 85 48, 95 68 C105 72, 110 82, 110 95 Z"
              fill={c.wash1}
              fillOpacity="0.08"
            />
            <path
              d="M15 95 C10 75, 25 58, 40 65 C52 52, 70 52, 80 65 C92 65, 102 75, 100 95 Z"
              fill={c.wash2}
              fillOpacity="0.08"
              style={{ animationDelay: "1s" }}
            />
            <path
              d="M25 95 C22 80, 35 70, 48 74 C58 66, 72 66, 80 74 C85 78, 88 85, 85 95 Z"
              fill={c.wash1}
              fillOpacity="0.06"
              style={{ animationDelay: "2s" }}
            />

            <circle cx="35" cy="55" r="3.5" fill={c.ink} fillOpacity="0.1" />
            <circle cx="75" cy="58" r="3" fill={c.ink} fillOpacity="0.08" />
            <circle cx="58" cy="50" r="4" fill={c.ink} fillOpacity="0.08" />
          </g>
        </svg>
      </div>
    </div>
  );
}
