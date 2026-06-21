import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "常見問題",
  description:
    "解答關於樹心理工作室的常見問題，包括預約流程、費用、保密原則、心理輔導適合哪些人等。",
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
