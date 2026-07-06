import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth-role";
import TherapistProfileEditor from "./TherapistProfileEditor";
import TherapistAvailability from "./TherapistAvailability";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MemberEditPage({ params }: Props) {
  const { id } = await params;

  const auth = await requireAuth();

  const supabase = await createClient();
  const [{ data: profile }, { data: availability }] = await Promise.all([
    supabase.from("therapist_profiles").select("*").eq("id", id).single(),
    createAdminClient()
      .from("therapist_availability")
      .select("*")
      .eq("therapist_id", id)
      .order("day_of_week")
      .order("start_time"),
  ]);

  if (!profile) notFound();

  if (auth.role === "therapist" && auth.profileId !== id) {
    redirect(auth.profileId ? `/admin/members/${auth.profileId}` : "/admin");
  }

  const displayName = profile?.name || id;

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h1 className="font-serif text-deep text-2xl">{displayName}</h1>
        {profile?.title && (
          <p className="font-sans text-xs text-muted mt-0.5">{profile.title}</p>
        )}
      </div>

      <TherapistAvailability
        therapistId={id}
        initialSlots={(availability ?? []) as {
          id: string; therapist_id: string; day_of_week: number;
          start_time: string; end_time: string; is_active: boolean;
        }[]}
      />

      <TherapistProfileEditor
        therapistId={id}
        userRole={auth.role}
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
