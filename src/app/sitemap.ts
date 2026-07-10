import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

const BASE = "https://www.treecounseling.com";

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: BASE,                   changeFrequency: "weekly",  priority: 1.0 },
  { url: `${BASE}/about`,        changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE}/services`,     changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE}/team`,         changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE}/news`,         changeFrequency: "weekly",  priority: 0.7 },
  { url: `${BASE}/faq`,          changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE}/booking`,      changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE}/assessment`,   changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE}/privacy`,      changeFrequency: "yearly",  priority: 0.3 },
  { url: `${BASE}/terms`,        changeFrequency: "yearly",  priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = createAdminClient();

  const [{ data: therapists }, { data: articles }] = await Promise.all([
    db.from("therapist_profiles").select("id, updated_at"),
    db.from("articles").select("id, updated_at").eq("published", true),
  ]);

  const therapistPages: MetadataRoute.Sitemap = (therapists ?? []).map((t) => ({
    url: `${BASE}/team/${t.id}`,
    lastModified: t.updated_at ? new Date(t.updated_at) : undefined,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const articlePages: MetadataRoute.Sitemap = (articles ?? []).map((a) => ({
    url: `${BASE}/news/${a.id}`,
    lastModified: a.updated_at ? new Date(a.updated_at) : undefined,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...STATIC_PAGES, ...therapistPages, ...articlePages];
}
