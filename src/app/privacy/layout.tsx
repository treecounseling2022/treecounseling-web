import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隱私權政策",
  description:
    "樹心理工作室隱私權政策：說明我們如何收集、使用、保存及保護您的個人資料，以及您依澳門個人資料保護法所享有的權利。",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
