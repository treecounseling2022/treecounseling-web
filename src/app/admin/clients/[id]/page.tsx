import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, isAdminLevel } from "@/lib/auth-role";
import ClientEditor from "./ClientEditor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: Props) {
  const auth = await requireAuth();
  if (!isAdminLevel(auth.role)) redirect("/admin");

  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (!client) notFound();

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
          {client.full_name}
        </p>
        <h1 className="font-serif text-deep text-2xl">{client.full_name}</h1>
        <p className="font-sans text-[11px] text-muted mt-0.5">
          建立於 {new Date(client.created_at).toLocaleDateString("zh-TW")}
        </p>
      </div>

      <ClientEditor
        initialData={client}
        therapists={therapists ?? []}
      />
    </div>
  );
}
