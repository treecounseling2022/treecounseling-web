import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RedirectToNewAppt({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/appointments/new?client_id=${id}`);
}
