import type { Metadata } from "next";
import { Noto_Serif_TC, Noto_Sans_TC, EB_Garamond } from "next/font/google";
import "./globals.css";
import PublicShell from "@/components/layout/PublicShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import PwaRegister from "@/components/PwaRegister";


const notoSerifTC = Noto_Serif_TC({
  variable: "--font-noto-serif-tc",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://treecounseling.com"),
  title: {
    default: "樹心理工作室｜專業心理輔導｜澳門",
    template: "%s｜樹心理工作室",
  },
  description:
    "樹心理工作室成立於2022年，是澳門少有的專業心理輔導私營機構，提供個人輔導、伴侶輔導、線上輔導及工作坊服務。",
  keywords: ["心理輔導", "諮商", "澳門", "樹心理工作室", "心理健康"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "樹心理工作室",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
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
      suppressHydrationWarning
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#3a4a3a" />
      </head>
      <body className="min-h-screen flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-forest focus:text-paper focus:text-sm focus:font-sans focus:rounded-sm"
        >
          跳至主要內容
        </a>
        <PwaRegister />
        <ThemeProvider>
          <PublicShell>{children}</PublicShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
