import { ImageResponse } from "next/og";

export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.treecounseling.com";

  let fonts: { name: string; data: ArrayBuffer; weight: 600; style: "normal" }[] = [];
  try {
    const latin = await fetch(`${BASE}/fonts/noto-sc-latin-600.woff2`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.arrayBuffer();
    });
    fonts = [{ name: "Noto", data: latin, weight: 600, style: "normal" }];
  } catch (e) {
    console.error("Font load failed:", e);
  }

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
          fontFamily: fonts.length ? "Noto" : "sans-serif",
        }}
      >
        {`Font loaded: ${fonts.length > 0} — Tree Counseling Studio`}
      </div>
    ),
    { width: 1200, height: 630, fonts }
  );
}
