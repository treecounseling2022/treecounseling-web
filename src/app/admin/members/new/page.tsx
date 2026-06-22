import { requireAuth, isAdminLevel } from "@/lib/auth-role";
import { redirect } from "next/navigation";
import NewTherapistForm from "./NewTherapistForm";

export default async function NewTherapistPage() {
  const auth = await requireAuth();
  if (!isAdminLevel(auth.role)) redirect("/admin");

  return (
    <div className="max-w-lg pt-4 space-y-6">
      <div>
        <h1 className="font-serif text-deep text-2xl">新增心理師</h1>
        <p className="font-sans text-xs text-muted mt-1">
          建立後可在成員頁面補充詳細資料，並透過「邀請成員」發送登入邀請。
        </p>
      </div>
      <NewTherapistForm />
    </div>
  );
}
