"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function handleCallback() {
      // Invite links use implicit flow: token is in URL hash (#access_token=...)
      // Hash is never sent to the server, so this must run client-side
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
        }
      }

      // Magic links / social login use PKCE: code is in ?code= query param
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace("/admin/login?error=auth_failed");
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
