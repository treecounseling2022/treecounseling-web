import type { Metadata } from "next";
import { Noto_Serif_TC, Noto_Sans_TC, EB_Garamond } from "next/font/google";
import "./globals.css";
import PublicShell from "@/components/layout/PublicShell";
import { ThemeProvider } from "@/components/ThemeProvider";


const notoSerifTC = Noto_Serif_TC({
  variable: "--font-noto-serif-tc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "樹心理工作室｜專業心理輔導｜澳門",
    template: "%s｜樹心理工作室",
  },
  description:
    "樹心理工作室成立於2022年，是澳門少有的專業心理輔導私營機構，提供個人輔導、伴侶輔導、線上輔導及工作坊服務。",
  keywords: ["心理輔導", "諮商", "澳門", "樹心理工作室", "心理健康"],
  openGraph: {
    siteName: "樹心理工作室",
    locale: "zh_TW",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`${notoSerifTC.variable} ${notoSansTC.variable} ${ebGaramond.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <PublicShell>{children}</PublicShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
