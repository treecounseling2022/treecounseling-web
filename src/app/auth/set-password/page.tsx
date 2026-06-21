"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // PKCE flow: exchange the ?code= from password reset email before updateUser()
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      const supabase = createClient();
      supabase.auth.exchangeCodeForSession(code);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("密碼至少需要 8 個字元");
      return;
    }
    if (password !== confirm) {
      setError("兩次輸入的密碼不一致");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // After setting password, redirect based on role
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-serif text-deep mb-2">設定登入密碼</h1>
        <p className="text-sm text-muted font-sans mb-8">
          請為您的帳號設定一組密碼，之後登入時使用。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-muted font-sans mb-1">
              密碼（至少 8 個字元）
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className="w-full border border-soft rounded-md px-3 py-2 text-sm font-sans text-deep focus:outline-none focus:ring-2 focus:ring-forest/40"
            />
          </div>

          <div>
            <label className="block text-xs text-muted font-sans mb-1">
              確認密碼
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full border border-soft rounded-md px-3 py-2 text-sm font-sans text-deep focus:outline-none focus:ring-2 focus:ring-forest/40"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 font-sans">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-forest text-paper text-sm font-sans py-2 rounded-md hover:bg-forest/90 transition-colors disabled:opacity-50"
          >
            {loading ? "設定中…" : "確認設定"}
          </button>
        </form>
      </div>
    </div>
  );
}
