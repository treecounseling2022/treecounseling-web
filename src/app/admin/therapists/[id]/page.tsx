import { notFound } from "next/navigation";
import { TEAM } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import TherapistProfileEditor from "./TherapistProfileEditor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TherapistEditPage({ params }: Props) {
  const { id } = await params;
  const member = TEAM.find((m) => m.id === id);
  if (!member) notFound();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("therapist_profiles")
    .select("*")
    .eq("id", id)
    .single();

  return (
    <div className="space-y-6 pt-4">
      <div>
        <p className="font-sans text-xs text-muted mb-1">
          <a href="/admin/therapists" className="hover:text-forest">心理師資料</a>
          {" / "}
          {member.name}
        </p>
        <h1 className="font-serif text-deep text-2xl">{member.name} 的資料</h1>
        <p className="font-sans text-xs text-muted mt-0.5">{member.title}</p>
      </div>

      <TherapistProfileEditor
        therapistId={id}
        initialData={profile ?? { id, licenses: [], associations: [], experience: [], training: [], publications: [], services: [] }}
      />
    </div>
  );
}
