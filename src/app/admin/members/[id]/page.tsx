import { notFound, redirect } from "next/navigation";
import { TEAM } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, isAdminLevel } from "@/lib/auth-role";
import TherapistProfileEditor from "./TherapistProfileEditor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MemberEditPage({ params }: Props) {
  const { id } = await params;
  if (!TEAM.find((m) => m.id === id)) notFound();

  const auth = await requireAuth();

  if (auth.role === "therapist" && auth.profileId !== id) {
    redirect(auth.profileId ? `/admin/members/${auth.profileId}` : "/admin");
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("therapist_profiles")
    .select("*")
    .eq("id", id)
    .single();

  const displayName = profile?.name || id;

  return (
    <div className="space-y-6 pt-4">
      <div>
        <p className="font-sans text-xs text-muted mb-1">
          {isAdminLevel(auth.role) ? (
            <a href="/admin/members" className="hover:text-forest">
              成員資料
            </a>
          ) : (
            "我的資料"
          )}
          {" / "}
          {displayName}
        </p>
        <h1 className="font-serif text-deep text-2xl">{displayName}</h1>
        {profile?.title && (
          <p className="font-sans text-xs text-muted mt-0.5">{profile.title}</p>
        )}
      </div>

      <TherapistProfileEditor
        therapistId={id}
        initialData={{
          id,
          name: "",
          name_en: "",
          bio: "",
          photo_url: "",
          title: "",
          client_letter: "",
          education: [],
          specialties: [],
          orientations: [],
          socials: {},
          licenses: [],
          associations: [],
          experience: [],
          training: [],
          publications: [],
          services: [],
          ...(profile ?? {}),
        }}
      />
    </div>
  );
}
