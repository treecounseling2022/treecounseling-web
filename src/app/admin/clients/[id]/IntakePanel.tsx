"use client";

import { useState } from "react";

interface Props {
  clientId: string;
  intakeToken: string | null;
  intakeSummary: string | null;
  intakeSubmittedAt: string | null;
}

export default function IntakePanel({ clientId, intakeToken, intakeSummary, intakeSubmittedAt }: Props) {
  const [copied, setCopied] = useState(false);
  void clientId;

  const intakeUrl = intakeToken
    ? `${typeof window !== "undefined" ? window.location.origin : "https://treecounseling.com"}/intake?token=${intakeToken}`
    : null;

  const handleCopy = async () => {
    if (!intakeUrl) return;
    await navigator.clipboard.writeText(intakeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-sand/20">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-sand/15 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-deep text-base">AI 初談資料</h2>
          {intakeSubmittedAt ? (
            <span className="font-sans text-[10px] bg-forest/10 text-forest border border-forest/20 px-2 py-0.5">
              已填寫
            </span>
          ) : (
            <span className="font-sans text-[10px] bg-sand/20 text-muted border border-sand/20 px-2 py-0.5">
              未填寫
            </span>
          )}
        </div>
        {intakeSubmittedAt && (
          <p className="font-sans text-[11px] text-muted/60">
            {new Date(intakeSubmittedAt).toLocaleString("zh-TW", {
              year: "numeric", month: "short", day: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* 初談連結 */}
        <div className="space-y-1.5">
          <p className="font-sans text-[11px] text-muted">發送給個案的初談連結</p>
          {intakeUrl ? (
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={intakeUrl}
                className="flex-1 px-3 py-2 font-sans text-xs text-muted bg-soft border border-sand/25 outline-none select-all cursor-text"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2 font-sans text-xs bg-deep hover:bg-forest text-paper transition-colors flex-shrink-0"
              >
                {copied ? "已複製 ✓" : "複製"}
              </button>
            </div>
          ) : (
            <p className="font-sans text-xs text-muted/50 bg-sand/10 px-3 py-2">
              尚未產生初談 token，請執行 migration 021。
            </p>
          )}
          <p className="font-sans text-[10px] text-muted/50">
            可直接貼到確認 email 或 WhatsApp，個案開啟後即可開始初談。
          </p>
        </div>

        {/* 初談摘要 */}
        {intakeSummary ? (
          <div className="space-y-1.5">
            <p className="font-sans text-[11px] text-muted">初談摘要</p>
            <pre className="font-sans text-xs text-deep/90 leading-relaxed whitespace-pre-wrap bg-soft/60 border border-sand/15 p-4 select-text">
              {intakeSummary}
            </pre>
          </div>
        ) : (
          <p className="font-sans text-xs text-muted/40 italic">
            個案完成初談後，摘要將自動顯示於此。
          </p>
        )}

      </div>
    </div>
  );
}
