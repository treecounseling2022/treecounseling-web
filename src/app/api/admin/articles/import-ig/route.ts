import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;

function extractShortcode(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("instagram.com")) return null;
    const m = u.pathname.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'");
}

// Scrape og:description from the public IG page — no API key needed.
// Works when Instagram serves the tag server-side (common for SEO).
async function scrapeCaption(canonicalUrl: string): Promise<{ caption?: string; authorName?: string }> {
  try {
    const res = await fetch(canonicalUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return {};
    const html = await res.text();

    const ogDesc =
      html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)?.[1] ??
      html.match(/<meta\s+content="([^"]+)"\s+property="og:description"/i)?.[1];

    const ogSite =
      html.match(/<meta\s+property="og:site_name"\s+content="([^"]+)"/i)?.[1];

    // og:description for IG is usually: "N likes, K comments - username: caption…"
    // Strip the leading stats prefix if present
    let caption = ogDesc ? decodeHtmlEntities(ogDesc.trim()) : undefined;
    if (caption) {
      // "123 likes, 4 comments - username: actual caption" → keep everything after ": "
      const colonIdx = caption.indexOf(": ");
      if (colonIdx !== -1 && colonIdx < 80) {
        caption = caption.slice(colonIdx + 2).trim();
      }
    }

    const authorName = ogSite === "Instagram" ? undefined : ogSite;
    return { caption, authorName };
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const url = body?.url;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "請提供 IG 網址" }, { status: 400 });
  }

  const shortcode = extractShortcode(url.trim());
  if (!shortcode) {
    return NextResponse.json(
      { error: "無法識別 Instagram 貼文連結，請確認網址格式正確" },
      { status: 400 }
    );
  }

  const canonicalUrl = `https://www.instagram.com/p/${shortcode}/`;
  const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/`;

  let caption: string | undefined;
  let authorName: string | undefined;

  // Priority 1: oEmbed API (requires env vars, most reliable)
  if (INSTAGRAM_APP_ID && INSTAGRAM_APP_SECRET) {
    try {
      const token = `${INSTAGRAM_APP_ID}|${INSTAGRAM_APP_SECRET}`;
      const res = await fetch(
        `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(canonicalUrl)}&fields=title,author_name&access_token=${encodeURIComponent(token)}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (res.ok) {
        const data = await res.json() as { title?: string; author_name?: string };
        caption = data.title?.trim() || undefined;
        authorName = data.author_name?.trim() || undefined;
      }
    } catch { /* optional */ }
  }

  // Priority 2: scrape og:description (no API key needed)
  if (!caption) {
    const scraped = await scrapeCaption(canonicalUrl);
    caption = scraped.caption;
    authorName = scraped.authorName ?? authorName;
  }

  return NextResponse.json({ shortcode, canonicalUrl, embedUrl, caption, authorName });
}
