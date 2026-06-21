import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "心理評估",
  description:
    "透過簡短的自我評估問卷，了解您目前的心理健康狀況，並獲得適合的輔導建議。",
};

export default function AssessmentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
