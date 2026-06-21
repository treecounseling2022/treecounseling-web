import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.treecounseling.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/auth/", "/intake", "/offline"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
