"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import AIChatWidget from "@/components/ui/AIChatWidget";

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBackend = pathname.startsWith("/admin") || pathname.startsWith("/auth");

  if (isBackend) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main id="main-content" className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <AIChatWidget />
    </>
  );
}
