import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "dark" | "light";
  className?: string;
  showText?: boolean;
}

export default function Logo({ variant = "dark", className, showText = true }: LogoProps) {
  const isLight = variant === "light";
  
  // 樣式對應表
  const strokeColor = isLight ? "stroke-paper" : "stroke-deep";
  const fillColor = isLight ? "fill-paper" : "fill-deep";
  const textColor = isLight ? "text-paper" : "text-deep";
  const dividerBg = isLight ? "bg-paper/30" : "bg-deep/25";
  const enColor = isLight ? "text-paper/60" : "text-deep/55";

  // 單獨的年輪標誌 SVG (缺口年輪，加入 overflow-visible 避免邊緣被裁切)
  const MarkSvg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="5 5 94 94"
      className="h-full w-auto aspect-square flex-shrink-0 overflow-visible"
      aria-hidden="true"
    >
      <path d="M52 8 A 44 44 0 1 1 88 88" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" className={strokeColor} />
      <path d="M52 18 A 34 34 0 1 1 82 78" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" className={strokeColor} />
      <path d="M52 28 A 24 24 0 1 1 74 68" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" className={strokeColor} />
      <path d="M52 38 A 14 14 0 1 1 64 60" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" className={strokeColor} />
      <path d="M52 48 A 4 4 0 1 1 54 56" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" className={strokeColor} />
      <circle cx="52" cy="52" r="2.2" fill="currentColor" className={fillColor} />
    </svg>
  );

  if (!showText) {
    return (
      <div className={cn("inline-flex items-center", className)}>
        {MarkSvg}
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-3 sm:gap-4 select-none", className)}>
      {/* 1. 年輪標誌 */}
      <div className="h-full py-0.5 flex-shrink-0 flex items-center">
        {MarkSvg}
      </div>

      {/* 2. 垂直分隔線 */}
      <div className={cn("w-[1px] h-3/5 self-center", dividerBg)} />

      {/* 3. 中英文文字 */}
      <div className="flex flex-col justify-center text-left leading-none">
        <span 
          className={cn(
            "font-serif font-normal tracking-[4px] sm:tracking-[5px] text-base sm:text-lg md:text-xl",
            textColor
          )}
        >
          樹心理工作室
        </span>
        <span 
          className={cn(
            "font-garamond font-normal tracking-[2px] sm:tracking-[3px] text-[9.5px] sm:text-[11px] md:text-[12px] mt-1.5 opacity-80",
            enColor
          )}
        >
          Tree Counseling Studio
        </span>
      </div>
    </div>
  );
}
