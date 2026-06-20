import type { Metadata } from "next";
import { Suspense } from "react";
import AIIntakeChat from "@/components/ui/AIIntakeChat";

export const metadata: Metadata = {
  title: "首次晤談前資料收集",
  description: "在與心理輔導人員見面前，透過 AI 助理溫和地梳理你的狀況，協助心理輔導人員更快了解你。",
  robots: { index: false },
};

export default function IntakePage() {
  return (
    <main className="min-h-screen bg-soft/40 pt-28 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10 text-center">
          <p className="font-sans text-xs tracking-widest text-sand uppercase mb-3">Pre-Session</p>
          <h1 className="font-serif text-deep text-3xl md:text-4xl mb-4">首次晤談前資料收集</h1>
          <p className="font-sans text-muted text-sm leading-relaxed max-w-md mx-auto">
            這份初談由 AI 助理陪你完成，大約需要 10–15 分鐘。<br />
            所有內容嚴格保密，僅供你的心理輔導人員閱覽。
          </p>
        </div>
        <Suspense>
          <AIIntakeChat />
        </Suspense>
      </div>
    </main>
  );
}
