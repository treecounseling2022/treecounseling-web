import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, isAdminLevel } from "@/lib/auth-role";
import TherapistNewApptForm from "./TherapistNewApptForm";

interface Props {
  searchParams: Promise<{ client_id?: string }>;
}

export default async function NewAppointmentPage({ searchParams }: Props) {
  const auth = await requireAuth();

  // Admin/director uses the main appointments flow
  if (isAdminLevel(auth.role)) redirect("/admin/appointments");
  if (!auth.profileId) redirect("/admin");

  const { client_id: preselectedClientId } = await searchParams;
  const supabase = await createClient();

  // Fetch this therapist's clients:
  // assigned to them OR have confirmed/locked appointments with them
  const { data: apptClients } = await supabase
    .from("appointments")
    .select("client_id")
    .eq("therapist_id", auth.profileId)
    .in("booking_status", ["confirmed", "locked"]);

  const apptClientIds = [
    ...new Set((apptClients ?? []).map((a) => a.client_id).filter(Boolean)),
  ] as string[];

  let clientQuery = supabase
    .from("clients")
    .select("id, full_name")
    .eq("is_active", true)
    .order("full_name");

  if (apptClientIds.length > 0) {
    clientQuery = clientQuery.or(
      `assigned_therapist_id.eq.${auth.profileId},id.in.(${apptClientIds.join(",")})`
    );
  } else {
    clientQuery = clientQuery.eq("assigned_therapist_id", auth.profileId);
  }

  const { data: clients } = await clientQuery;

  // Fetch rooms + service plans in parallel
  const [{ data: rooms }, { data: plans }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name, color, is_online")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("service_plans")
      .select("id, name, price_per_session, currency")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  return (
    <div className="space-y-6 pt-4 max-w-lg">
      <div>
        <p className="font-sans text-xs text-muted mb-1">
          <a href="/admin" className="hover:text-forest">後台</a>
          {" / "}
          <a href="/admin/appointments" className="hover:text-forest">預約</a>
          {" / "}
          新增預約
        </p>
        <h1 className="font-serif text-deep text-2xl">新增預約</h1>
      </div>

      <TherapistNewApptForm
        clients={clients ?? []}
        defaultClientId={preselectedClientId}
        rooms={rooms ?? []}
        plans={plans ?? []}
      />
    </div>
  );
}
