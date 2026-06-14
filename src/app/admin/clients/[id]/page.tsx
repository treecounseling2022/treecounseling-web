import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, isAdminLevel } from "@/lib/auth-role";
import ClientEditor from "./ClientEditor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: Props) {
  const auth = await requireAuth();
  const isAdmin = isAdminLevel(auth.role);

  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (!client) notFound();

  // Therapists may only view clients assigned to them
  if (!isAdmin && client.assigned_therapist_id !== auth.profileId) notFound();

  const therapists = isAdmin
    ? ((await supabase.from("therapist_profiles").select("id, name").order("name")).data ?? [])
    : [];

  const clientsLabel = isAdmin ? "個案管理" : "我的個案";

  return (
    <div className="space-y-6 pt-4 max-w-2xl">
      <div>
        <p className="font-sans text-xs text-muted mb-1">
          <a href="/admin" className="hover:text-forest">後台</a>
          {" / "}
          <a href="/admin/clients" className="hover:text-forest">{clientsLabel}</a>
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
        therapists={therapists}
        readonly={!isAdmin}
      />
    </div>
  );
}
