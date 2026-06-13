"use client";

import { useState } from "react";

type MemberOption = {
  id: string;
  name: string;
  hasAccount: boolean;
};

type Props = {
  members: MemberOption[];
  isDirector: boolean;
};

export default function InviteForm({ members, isDirector }: Props) {
  const [email, setEmail] = useState("");
  const [profileId, setProfileId] = useState("");
  const [role, setRole] = useState<"therapist" | "admin">("therapist");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
    warning?: string;
    inviteRole?: string;
  } | null>(null);

  const isTherapist = role === "therapist";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          profileId: isTherapist ? profileId || undefined : undefined,
        }),
      });
      const json = await res.json();
      setResult(json);
      if (json.success) {
        setEmail("");
        setProfileId("");
      }
    } catch {
      setResult({ error: "網路錯誤，請稍後再試" });
    } finally {
      setLoading(false);
    }
  }

  const roleLabel: Record<string, string> = {
    therapist: "心理師",
    admin: "行政",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {/* Role selector (director only) */}
      {isDirector && (
        <div>
          <label className="block font-sans text-xs text-deep mb-2">帳號類型</label>
          <div className="flex gap-3">
            {(["therapist", "admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2.5 font-sans text-xs border transition-colors cursor-pointer ${
                  role === r
                    ? "bg-forest text-paper border-forest"
                    : "bg-white text-muted border-sand/30 hover:border-forest/40"
                }`}
              >
                {roleLabel[r]}
              </button>
            ))}
          </div>
          <p className="font-sans text-[11px] text-muted/60 mt-1">
            {role === "admin"
              ? "行政帳號可管理成員資料、文章及邀請心理師。"
              : "心理師帳號只能編輯自己的資料頁面。"}
          </p>
        </div>
      )}

      <div>
        <label className="block font-sans text-xs text-deep mb-2">
          Email <span className="text-red-400">*</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@treecounseling.com"
          required
          className="w-full border border-sand/30 px-4 py-3 font-sans text-sm text-deep bg-white focus:outline-none focus:border-forest/50 transition-colors"
        />
        <p className="font-sans text-[11px] text-muted/60 mt-1">
          系統將發送邀請信，對方點擊連結後可設定密碼並登入後台。
        </p>
      </div>

      {isTherapist && (
        <div>
          <label className="block font-sans text-xs text-deep mb-2">
            連結成員資料（可選）
          </label>
          <select
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            className="w-full border border-sand/30 px-4 py-3 font-sans text-sm text-deep bg-white focus:outline-none focus:border-forest/50 transition-colors"
          >
            <option value="">— 稍後手動連結 —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id} disabled={m.hasAccount}>
                {m.name}
                {m.hasAccount ? "（已連結）" : ""}
              </option>
            ))}
          </select>
          <p className="font-sans text-[11px] text-muted/60 mt-1">
            選擇後，諮商師登入後可直接編輯自己的資料頁面。
          </p>
        </div>
      )}

      {result && (
        <div
          className={`p-4 border font-sans text-sm ${
            result.success
              ? "border-forest/30 bg-forest/5 text-forest"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {result.success &&
            `✓ 邀請已發送！對方將以「${roleLabel[result.inviteRole ?? "therapist"]}」身份加入。`}
          {result.warning && (
            <p className="mt-1 text-amber-700 text-xs">{result.warning}</p>
          )}
          {result.error && `✕ ${result.error}`}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !email}
        className="px-8 py-3 bg-forest text-paper font-sans text-xs tracking-widest hover:bg-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? "發送中…" : "發送邀請"}
      </button>
    </form>
  );
}
