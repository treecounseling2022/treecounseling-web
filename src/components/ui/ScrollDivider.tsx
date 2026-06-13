"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollDividerProps {
  className?: string;
  duration?: number; // 動畫毫秒數
}

export default function ScrollDivider({ className, duration = 1500 }: ScrollDividerProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      className={cn("w-full h-[2px] overflow-visible pointer-events-none block", className)}
      viewBox="0 0 1000 2"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line
        x1="0"
        y1="1"
        x2="1000"
        y2="1"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="1000"
        strokeDashoffset={active ? "0" : "1000"}
        style={{
          transition: `stroke-dashoffset ${duration}ms cubic-bezier(0.25, 1, 0.5, 1)`,
        }}
        className="text-sand/30"
      />
    </svg>
  );
}
