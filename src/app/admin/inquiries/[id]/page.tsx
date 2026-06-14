import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, isAdminLevel } from "@/lib/auth-role";
import { notFound } from "next/navigation";
import InquiryDetailClient from "./InquiryDetailClient";

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requireAuth();
  if (!isAdminLevel(auth.role)) notFound();

  const { id } = await params;
  const db = createAdminClient();

  const { data: inquiry } = await db
    .from("booking_inquiries")
    .select("*")
    .eq("id", id)
    .single();

  if (!inquiry) notFound();

  const { data: therapists } = await db
    .from("therapist_profiles")
    .select("id, name, services")
    .order("name");

  const { data: rooms } = await db
    .from("rooms")
    .select("id, name")
    .order("name");

  return (
    <InquiryDetailClient
      inquiry={inquiry}
      therapists={therapists ?? []}
      rooms={rooms ?? []}
    />
  );
}
