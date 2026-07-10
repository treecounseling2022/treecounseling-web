import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "服務條款",
  description:
    "樹心理工作室服務條款：說明服務性質、預約與取消政策、收費與付款方式、責任範圍等使用網站與預約服務前應了解的事項。",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
