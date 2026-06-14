import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, isAdminLevel } from "@/lib/auth-role";
import ClientEditor from "../[id]/ClientEditor";

export default async function NewClientPage() {
  const auth = await requireAuth();
  if (!isAdminLevel(auth.role)) redirect("/admin");

  const supabase = await createClient();
  const { data: therapists } = await supabase
    .from("therapist_profiles")
    .select("id, name")
    .order("name");

  return (
    <div className="space-y-6 pt-4 max-w-2xl">
      <div>
        <p className="font-sans text-xs text-muted mb-1">
          <a href="/admin" className="hover:text-forest">後台</a>
          {" / "}
          <a href="/admin/clients" className="hover:text-forest">個案管理</a>
          {" / "}
          新增個案
        </p>
        <h1 className="font-serif text-deep text-2xl">新增個案</h1>
      </div>

      <ClientEditor initialData={{}} therapists={therapists ?? []} />
    </div>
  );
}
