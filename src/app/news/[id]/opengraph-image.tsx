import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFont(text: string) {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@600&text=${encodeURIComponent(text)}`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }
    ).then((r) => r.text());
    const urls = [...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map((m) => m[1]);
    return Promise.all(urls.map((url) => fetch(url).then((r) => r.arrayBuffer())));
  } catch {
    return [];
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const db = createAdminClient();
  const { data: article } = await db
    .from("articles")
    .select("title, excerpt, category")
    .eq("id", id)
    .eq("published", true)
    .single();

  if (!article) return new Response("Not found", { status: 404 });

  const title = article.title ?? "";
  const excerpt = article.excerpt ?? "";
  const category = article.category ?? "";
  const truncatedExcerpt = excerpt.length > 55 ? excerpt.slice(0, 55) + "…" : excerpt;
  const titleFontSize = title.length > 18 ? 44 : title.length > 12 ? 54 : 64;

  const text = `樹心理工作室${title}${truncatedExcerpt}${category}`;
  const fontBuffers = await loadFont(text);
  const fonts = fontBuffers.map((data) => ({
    name: "Noto",
    data,
    weight: 600 as const,
    style: "normal" as const,
  }));

  return new ImageResponse(
    (
      <div
        style={{
          background: "#f5f1ea",
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
            background: "#3a4a3a",
            display: "flex",
          }}
        />

        {category ? (
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: "#3a4a3a",
              color: "#f5f1ea",
              padding: "6px 20px",
              fontSize: 16,
              fontFamily: "Noto",
              letterSpacing: "0.05em",
            }}
          >
            {category}
          </div>
        ) : (
          <div style={{ display: "flex" }} />
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: titleFontSize,
              color: "#1f2a24",
              fontFamily: "Noto",
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>
          {truncatedExcerpt && (
            <div style={{ fontSize: 20, color: "#6b7c6b", fontFamily: "Noto", lineHeight: 1.6 }}>
              {truncatedExcerpt}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, color: "#3a4a3a", fontFamily: "Noto" }}>樹心理工作室</div>
          <div style={{ fontSize: 16, color: "#9aaa9a", fontFamily: "Noto" }}>treecounseling.com</div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
