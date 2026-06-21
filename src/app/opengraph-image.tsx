import { ImageResponse } from "next/og";

export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFonts() {
  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.treecounseling.com";
  const [chinese, latin] = await Promise.all([
    fetch(`${BASE}/fonts/noto-sc-chinese-600.woff2`).then((r) => r.arrayBuffer()),
    fetch(`${BASE}/fonts/noto-sc-latin-600.woff2`).then((r) => r.arrayBuffer()),
  ]);
  return [
    { name: "Noto", data: chinese, weight: 600 as const, style: "normal" as const },
    { name: "Noto", data: latin, weight: 600 as const, style: "normal" as const },
  ];
}

export default async function Image() {
  const fonts = await loadFonts();

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

        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 104, color: "#c9b88a", fontFamily: "Noto", lineHeight: 1 }}>
            樹
          </span>
          <span style={{ fontSize: 60, color: "#f5f1ea", fontFamily: "Noto", lineHeight: 1 }}>
            心理工作室
          </span>
        </div>

        <div
          style={{
            fontSize: 26,
            color: "#7aaa8a",
            fontFamily: "Noto",
            letterSpacing: "0.08em",
            marginBottom: 48,
          }}
        >
          Tree Counseling Studio
        </div>

        <div style={{ width: 56, height: 2, background: "#c9b88a", marginBottom: 48, display: "flex" }} />

        <div style={{ fontSize: 22, color: "#5a7a5a", fontFamily: "Noto" }}>
          澳門專業心理輔導服務
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 48,
            right: 96,
            fontSize: 16,
            color: "#4a6354",
            fontFamily: "Noto",
            letterSpacing: "0.05em",
            display: "flex",
          }}
        >
          treecounseling.com
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
