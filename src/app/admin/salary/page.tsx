import { requireAuth } from "@/lib/auth-role";
import SalaryClient from "./SalaryClient";

export default async function SalaryPage() {
  await requireAuth(["director"]);
  return <SalaryClient />;
}
