import { requireAuth, isAdminLevel } from "@/lib/auth-role";
import { redirect } from "next/navigation";
import ImportClient from "./ImportClient";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const auth = await requireAuth();
  if (!isAdminLevel(auth.role)) redirect("/admin");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-serif text-deep text-2xl">匯入個案資料</h1>
        <p className="font-sans text-sm text-muted mt-1">
          從 JotForm 匯出的 CSV 檔案批量匯入歷史個案，匯入後請人工校對並補充晤談記錄。
        </p>
      </div>
      <ImportClient />
    </div>
  );
}
