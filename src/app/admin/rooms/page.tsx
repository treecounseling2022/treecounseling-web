import { requireAuth } from "@/lib/auth-role";
import RoomsClient from "./RoomsClient";

export default async function RoomsPage() {
  await requireAuth(["director", "admin"]);
  return <RoomsClient />;
}
