import { ARTICLES as STATIC_ARTICLES } from "./data";

export type Article = {
  id: string;
  title: string;
  category: string;
  date: string;
  author: string;
  readTime: string;
  excerpt: string;
  photo: string;
  content: string;
};

// Normalize DB row (snake_case) → Article type
function normalize(row: Record<string, unknown>): Article {
  return {
    id: row.id as string,
    title: row.title as string,
    category: row.category as string,
    date: row.date as string,
    author: row.author as string,
    readTime: (row.read_time ?? row.readTime ?? "5 分鐘") as string,
    excerpt: (row.excerpt ?? "") as string,
    photo: (row.photo ?? "") as string,
    content: (row.content ?? "") as string,
  };
}

// Normalize static data (already has readTime)
const STATIC: Article[] = STATIC_ARTICLES.map((a) => ({
  id: a.id,
  title: a.title,
  category: a.category,
  date: a.date,
  author: a.author,
  readTime: a.readTime ?? "5 分鐘",
  excerpt: a.excerpt,
  photo: a.photo,
  content: a.content,
}));

export async function getAllArticles(): Promise<Article[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return STATIC;

  try {
    const { createClient } = await import("./supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("articles")
      .select("id, title, category, date, author, read_time, excerpt, photo, content")
      .eq("published", true)
      .order("date", { ascending: false });

    if (error || !data || data.length === 0) return STATIC;
    return data.map((row) => normalize(row as Record<string, unknown>));
  } catch {
    return STATIC;
  }
}

export async function getArticleById(id: string): Promise<Article | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return STATIC.find((a) => a.id === id) ?? null;
  }

  try {
    const { createClient } = await import("./supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("id", id)
      .eq("published", true)
      .single();

    if (error || !data) {
      return STATIC.find((a) => a.id === id) ?? null;
    }
    return normalize(data as Record<string, unknown>);
  } catch {
    return STATIC.find((a) => a.id === id) ?? null;
  }
}

export async function getAllArticleIds(): Promise<string[]> {
  const articles = await getAllArticles();
  const staticIds = STATIC.map((a) => a.id);
  const dbIds = articles.map((a) => a.id);
  return [...new Set([...staticIds, ...dbIds])];
}
