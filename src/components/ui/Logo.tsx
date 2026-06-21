import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "dark" | "light";
  className?: string;
  showText?: boolean;
}

export default function Logo({ variant = "dark", className, showText = true }: LogoProps) {
  const isLight = variant === "light";

  const textColor = isLight ? "text-paper" : "text-deep";
  const dividerBg = isLight ? "bg-paper/30" : "bg-deep/25";
  const enColor = isLight ? "text-paper/60" : "text-deep/55";

  const markSrc = isLight ? "/logo-paper.svg" : "/logo-forest.svg";

  const MarkSvg = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={markSrc}
      alt="樹心理工作室標誌"
      className="h-full w-auto aspect-square flex-shrink-0"
    />
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
