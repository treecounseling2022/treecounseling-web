import { requireAuth } from "@/lib/auth-role";
import ServicePlansClient from "./ServicePlansClient";

export default async function ServicePlansPage() {
  await requireAuth(["director", "admin"]);
  return <ServicePlansClient />;
}
