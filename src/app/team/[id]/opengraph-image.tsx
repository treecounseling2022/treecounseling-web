import { ImageResponse } from "next/og";
import { TEAM } from "@/lib/data";

export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFont(text: string) {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@600&text=${encodeURIComponent(text)}`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" } }
    ).then((r) => r.text());
    const urls = [...css.matchAll(/url\(["']?([^"')]+\.woff2)["']?\)/g)].map((m) => m[1]);
    if (!urls.length) return null;
    const buffers = await Promise.all(urls.map((url) => fetch(url).then((r) => r.arrayBuffer())));
    return buffers.map((data) => ({ name: "Noto", data, weight: 600 as const, style: "normal" as const }));
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = TEAM.find((m) => m.id === id);
  if (!member) return new Response("Not found", { status: 404 });

  const chars = `樹心理工作室心理師介紹Tree Counseling Studiotreecounseling.com${member.name}${member.title}`;
  const fontList = await loadFont(chars);
  const opts = fontList
    ? { width: 1200, height: 630, fonts: fontList }
    : { width: 1200, height: 630 };

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
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 8, background: "#c9b88a", display: "flex" }} />
        <div style={{ fontSize: 18, color: "#7aaa8a", fontFamily: "Noto", letterSpacing: "0.1em", display: "flex" }}>
          樹心理工作室 · 心理師介紹
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 88, color: "#f5f1ea", fontFamily: "Noto", lineHeight: 1.1 }}>{member.name}</div>
          <div style={{ fontSize: 30, color: "#c9b88a", fontFamily: "Noto" }}>{member.title}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 16, color: "#4a6354", fontFamily: "Noto" }}>Tree Counseling Studio</div>
          <div style={{ fontSize: 16, color: "#4a6354", fontFamily: "Noto" }}>treecounseling.com</div>
        </div>
      </div>
    ),
    opts
  );
}
