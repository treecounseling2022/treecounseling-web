import type { Metadata } from "next";
import { getAuthInfo } from "@/lib/auth-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminLevel } from "@/lib/auth-role";
import AdminSidebar from "./_components/AdminSidebar";
import AdminBreadcrumb from "./_components/AdminBreadcrumb";
import { AdminThemeProvider } from "./_components/AdminThemeProvider";

export const metadata: Metadata = {
  title: "後台管理 - 樹心理工作室",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthInfo();

  let pendingInquiries = 0;
  let pendingAppointments = 0;

  if (auth) {
    const db = createAdminClient();
    if (isAdminLevel(auth.role)) {
      const [inqRes, apptRes] = await Promise.all([
        db.from("booking_inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
        db.from("appointments").select("id", { count: "exact", head: true }).eq("booking_status", "pending_admin"),
      ]);
      pendingInquiries = inqRes.count ?? 0;
      pendingAppointments = apptRes.count ?? 0;
    } else if (auth.role === "therapist" && auth.profileId) {
      const { count } = await db
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("booking_status", "pending_therapist")
        .eq("therapist_id", auth.profileId);
      pendingAppointments = count ?? 0;
    }
  }

  return (
    <AdminThemeProvider>
      <div className="admin-shell min-h-screen">
        {auth ? (
          <>
            <AdminSidebar
              role={auth.role}
              email={auth.email ?? ""}
              profileId={auth.profileId ?? null}
              pendingInquiries={pendingInquiries}
              pendingAppointments={pendingAppointments}
            />
            <main className="admin-layout md:ml-52 p-5 md:p-8 max-w-5xl">
              <AdminBreadcrumb />
              {children}
            </main>
          </>
        ) : (
          <main className="admin-layout p-6 max-w-5xl mx-auto">{children}</main>
        )}
      </div>
    </AdminThemeProvider>
  );
}
