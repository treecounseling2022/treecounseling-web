import { ImageResponse } from "next/og";

export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CHARS = "樹心理工作室Tree Counseling Studio澳門專業輔導服務treecounseling.com";

async function loadFont() {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@600&text=${encodeURIComponent(CHARS)}`,
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

export default async function Image() {
  const fontList = await loadFont();
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
          justifyContent: "center",
          padding: "0 96px",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 8, background: "#c9b88a", display: "flex" }} />
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 104, color: "#c9b88a", fontFamily: "Noto", lineHeight: 1 }}>樹</span>
          <span style={{ fontSize: 60, color: "#f5f1ea", fontFamily: "Noto", lineHeight: 1 }}>心理工作室</span>
        </div>
        <div style={{ fontSize: 26, color: "#7aaa8a", fontFamily: "Noto", letterSpacing: "0.08em", marginBottom: 48 }}>
          Tree Counseling Studio
        </div>
        <div style={{ width: 56, height: 2, background: "#c9b88a", marginBottom: 48, display: "flex" }} />
        <div style={{ fontSize: 22, color: "#5a7a5a", fontFamily: "Noto" }}>澳門專業心理輔導服務</div>
        <div style={{ position: "absolute", bottom: 48, right: 96, fontSize: 16, color: "#4a6354", fontFamily: "Noto", letterSpacing: "0.05em", display: "flex" }}>
          treecounseling.com
        </div>
      </div>
    ),
    opts
  );
}
