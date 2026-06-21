import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";
import { TEAM } from "@/lib/data";

export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function loadFonts() {
  const base = path.join(process.cwd(), "node_modules/@fontsource/noto-sans-sc/files");
  const chinese = fs.readFileSync(path.join(base, "noto-sans-sc-chinese-simplified-600-normal.woff2"));
  const latin = fs.readFileSync(path.join(base, "noto-sans-sc-latin-600-normal.woff2"));
  return [
    { name: "Noto", data: Buffer.from(chinese), weight: 600 as const, style: "normal" as const },
    { name: "Noto", data: Buffer.from(latin), weight: 600 as const, style: "normal" as const },
  ];
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = TEAM.find((m) => m.id === id);
  if (!member) return new Response("Not found", { status: 404 });

  const fonts = loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          background: "#3a4a3a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 96px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 8,
            background: "#c9b88a",
            display: "flex",
          }}
        />

        <div style={{ fontSize: 18, color: "#7aaa8a", fontFamily: "Noto", letterSpacing: "0.1em", display: "flex" }}>
          樹心理工作室 · 心理師介紹
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 88, color: "#f5f1ea", fontFamily: "Noto", lineHeight: 1.1 }}>
            {member.name}
          </div>
          <div style={{ fontSize: 30, color: "#c9b88a", fontFamily: "Noto" }}>
            {member.title}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 16, color: "#4a6354", fontFamily: "Noto" }}>
            Tree Counseling Studio
          </div>
          <div style={{ fontSize: 16, color: "#4a6354", fontFamily: "Noto" }}>
            treecounseling.com
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
