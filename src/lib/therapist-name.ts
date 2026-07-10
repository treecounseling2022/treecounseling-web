import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 將表單中儲存的心理輔導人員 id（如 "tanky"）轉換成顯示用姓名。
 * 查無資料時原樣回傳輸入值，避免 PDF／畫面上完全空白。
 */
export async function resolveTherapistName(
  db: ReturnType<typeof createAdminClient>,
  idOrName?: string
): Promise<string | undefined> {
  if (!idOrName) return undefined;
  const { data } = await db
    .from("therapist_profiles")
    .select("name")
    .eq("id", idOrName)
    .maybeSingle();
  return data?.name ?? idOrName;
}
