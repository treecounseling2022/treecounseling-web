"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("電郵或密碼錯誤");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="font-sans text-xs tracking-widest text-sand uppercase mb-2">Admin</p>
          <h1 className="font-serif text-deep text-2xl">樹心理工作室</h1>
          <p className="font-sans text-xs text-muted mt-1">後台管理系統</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-sans text-xs text-deep mb-1.5">電郵</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-sand/30 bg-soft/40 px-4 py-2.5 font-sans text-sm text-deep focus:outline-none focus:border-forest transition-colors"
              placeholder="admin@treecounseling.com"
            />
          </div>
          <div>
            <label className="block font-sans text-xs text-deep mb-1.5">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-sand/30 bg-soft/40 px-4 py-2.5 font-sans text-sm text-deep focus:outline-none focus:border-forest transition-colors"
            />
          </div>
          {error && (
            <p className="font-sans text-xs text-red-500">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-forest text-paper font-sans text-xs tracking-widest hover:bg-deep transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? "登入中…" : "登入"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/auth/reset-password"
            className="font-sans text-[11px] text-muted/60 hover:text-muted transition-colors"
          >
            忘記密碼？
          </a>
        </div>
      </div>
    </div>
  );
}
