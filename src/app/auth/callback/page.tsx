"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function handleCallback() {
      const searchParams = new URLSearchParams(window.location.search);
      const nextParam = searchParams.get("next");

      // Invite / recovery links (implicit flow): token is in URL hash
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.slice(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            router.replace("/admin/login?error=auth_failed");
            return;
          }
          // Invite and recovery types both need the user to set a password
          const type = params.get("type");
          if (type === "invite" || type === "recovery") {
            router.replace("/auth/set-password");
            return;
          }
        }
      }

      // PKCE flow: code is in ?code= query param
      const code = searchParams.get("code");
      if (code) {
        // Detect PASSWORD_RECOVERY via auth event (more reliable than ?next=,
        // which Supabase may strip when validating redirectTo against allowed URLs).
        const detectedEvent = await new Promise<string>((resolve) => {
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event) => {
              // INITIAL_SESSION fires immediately on subscribe — skip it.
              if (event === "INITIAL_SESSION") return;
              subscription.unsubscribe();
              resolve(event);
            }
          );

          supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
            if (error) {
              subscription.unsubscribe();
              resolve("ERROR");
            }
          });
        });

        if (detectedEvent === "ERROR") {
          router.replace("/admin/login?error=auth_failed");
          return;
        }

        if (detectedEvent === "PASSWORD_RECOVERY") {
          router.replace("/auth/set-password");
          return;
        }

        // SIGNED_IN (invite or normal login) — honour ?next= if present
        if (nextParam) {
          router.replace(nextParam);
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const role = user.user_metadata?.role;

      if (role === "therapist") {
        const { data } = await supabase
          .from("therapist_profiles")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();

        if (data?.id) {
          router.replace(`/admin/members/${data.id}`);
          return;
        }
      }

      router.replace("/admin");
    }

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <p className="text-muted font-sans text-sm">登入中，請稍候…</p>
    </div>
  );
}
