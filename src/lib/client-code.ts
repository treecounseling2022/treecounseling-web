import { createAdminClient } from "@/lib/supabase/admin";

export const CLIENT_CODE_PATTERN = /^\d{5}$/;

export async function generateNextClientCode(
  db: ReturnType<typeof createAdminClient>
): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2); // "25", "26"...

  // Find highest existing code matching this year prefix
  const { data } = await db
    .from("clients")
    .select("client_code")
    .like("client_code", `${year}%`)
    .order("client_code", { ascending: false })
    .limit(1);

  let seq = 1;
  if (data && data.length > 0 && data[0].client_code) {
    const existing = parseInt(data[0].client_code.slice(2), 10);
    if (!isNaN(existing)) seq = existing + 1;
  }

  return `${year}${String(seq).padStart(3, "0")}`; // e.g., "26001"
}
