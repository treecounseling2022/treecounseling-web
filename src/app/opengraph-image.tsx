import { ImageResponse } from "next/og";

export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  let fontData: ArrayBuffer | null = null;
  try {
    fontData = await fetch(
      "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.2.9/files/noto-sans-sc-latin-600-normal.woff2"
    ).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.arrayBuffer();
    });
  } catch (e) {
    console.error("Font load failed:", e);
  }

  const opts = fontData
    ? { width: 1200, height: 630, fonts: [{ name: "Noto", data: fontData, weight: 600 as const, style: "normal" as const }] }
    : { width: 1200, height: 630 };

  return new ImageResponse(
    (
      <div
        style={{
          background: "#3a4a3a",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#f5f1ea",
          fontSize: 48,
        }}
      >
        {`Font: ${fontData ? "OK" : "FAILED"} — Tree Counseling Studio`}
      </div>
    ),
    opts
  );
}
