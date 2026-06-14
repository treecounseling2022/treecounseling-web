"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/set-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="font-serif text-deep text-2xl">已發送重設信件</h1>
          <p className="font-sans text-sm text-muted">
            請檢查 <strong>{email}</strong> 的收件匣，點擊信中連結重設密碼。
          </p>
          <a href="/admin/login" className="font-sans text-xs text-forest hover:underline block">
            ← 返回登入
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-serif text-deep text-2xl">重設密碼</h1>
          <p className="font-sans text-xs text-muted mt-1">
            輸入你的電郵，我們會發送重設連結。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-sans text-xs text-deep mb-1.5">電郵</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full border border-sand/30 bg-soft/40 px-4 py-2.5 font-sans text-sm text-deep focus:outline-none focus:border-forest transition-colors"
              placeholder="你的電郵地址"
            />
          </div>

          {error && <p className="font-sans text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-forest text-paper font-sans text-xs tracking-widest hover:bg-deep transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? "發送中…" : "發送重設連結"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/admin/login" className="font-sans text-[11px] text-muted/60 hover:text-muted transition-colors">
            ← 返回登入
          </a>
        </div>
      </div>
    </div>
  );
}
