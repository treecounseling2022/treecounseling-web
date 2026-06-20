"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  parts: { text: string }[];
}

type Stage = "loading" | "invalid" | "already_done" | "chat" | "submitted";

export default function AIIntakeChat() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [stage, setStage] = useState<Stage>("loading");
  const [clientName, setClientName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCrisisFlag, setHasCrisisFlag] = useState(false);
  const chatViewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 驗證 token
  useEffect(() => {
    if (!token) { setStage("invalid"); return; }

    fetch(`/api/intake?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setStage("invalid"); return; }
        if (data.alreadySubmitted) { setStage("already_done"); return; }
        setClientName(data.clientName);
        const welcome: Message = {
          role: "assistant",
          parts: [{ text: `你好，${data.clientName}，很高興認識你。這次的對話是為了讓我們的心理師在見面前更了解你的狀況，所有內容都會嚴格保密。\n\n請用你自己最自然的話，告訴我：是什麼讓你決定來尋求心理輔導？` }],
        };
        setMessages([welcome]);
        setStage("chat");
      })
      .catch(() => setStage("invalid"));
  }, [token]);

  // 只滾動聊天容器，不影響頁面位置
  useEffect(() => {
    const vp = chatViewportRef.current;
    if (vp) vp.scrollTop = vp.scrollHeight;
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: "user", parts: [{ text }] };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputVal("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) throw new Error("請求失敗");

      const data = await res.json();
      const replyText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      const crisis = replyText.includes("[CRISIS_FLAG]");
      const match = replyText.match(/\[SUMMARY_START\]([\s\S]*?)\[SUMMARY_END\]/);
      const displayReply = replyText
        .replace(/\[CRISIS_FLAG\]/, "")
        .replace(/\[SUMMARY_START\][\s\S]*?\[SUMMARY_END\]/, "")
        .trim();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", parts: [{ text: displayReply || "感謝你的分享。" }] },
      ]);

      if (crisis) setHasCrisisFlag(true);
      if (match) {
        autoSubmit(match[1].trim());
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", parts: [{ text: "抱歉，連線出現問題。請稍後再試，或直接與行政聯絡。" }] },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const autoSubmit = async (summary: string) => {
    setIsSubmitting(true);
    try {
      await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", token, messages: summary }),
      });
    } catch { /* 靜默失敗，仍顯示完成 */ }
    setStage("submitted");
    setIsSubmitting(false);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (stage === "loading") {
    return (
      <div className="max-w-lg mx-auto bg-paper border border-sand/20 p-8 text-center">
        <p className="font-sans text-sm text-muted animate-pulse">驗證中…</p>
      </div>
    );
  }

  // ── Invalid token ──────────────────────────────────────────────────────────
  if (stage === "invalid") {
    return (
      <div className="max-w-lg mx-auto bg-paper border border-sand/20 p-8 space-y-4 text-center">
        <h2 className="font-serif text-deep text-xl">連結無效或已過期</h2>
        <p className="font-sans text-sm text-muted leading-relaxed">
          請確認你使用的是確認 email 中的完整連結。如有疑問，請聯絡行政人員。
        </p>
        <a
          href="https://wa.me/85362772234"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-5 py-2.5 border border-sand/30 text-sm font-sans text-muted hover:text-forest hover:border-forest/40 transition-colors"
        >
          WhatsApp 聯絡行政
        </a>
      </div>
    );
  }

  // ── 已填過 ────────────────────────────────────────────────────────────────
  if (stage === "already_done") {
    return (
      <div className="max-w-lg mx-auto bg-paper border border-sand/20 p-8 space-y-4 text-center">
        <div className="w-12 h-12 border border-forest/40 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-serif text-deep text-xl">初談資料已送出</h2>
        <p className="font-sans text-sm text-muted leading-relaxed">
          你已完成初談，資料已傳送給心理師。期待與你相見。
        </p>
      </div>
    );
  }

  // ── 提交完成 ──────────────────────────────────────────────────────────────
  if (stage === "submitted") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto bg-paper border border-sand/20 p-8 text-center space-y-5"
      >
        <div className="w-12 h-12 border border-forest/40 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-serif text-deep text-2xl">資料已送出</h2>
        <p className="font-sans text-sm text-muted leading-relaxed max-w-sm mx-auto">
          初談摘要已傳送給心理師。他們在見面前會先閱讀，讓第一次晤談更快進入狀態。期待與你相見。
        </p>
      </motion.div>
    );
  }

  // ── 對話介面 ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto flex flex-col h-[600px] bg-paper border border-sand/20">
      {/* Header */}
      <div className="bg-forest px-5 py-3.5 flex items-center gap-2 text-paper flex-shrink-0">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-serif text-sm tracking-wide">初談助理</span>
        <span className="ml-auto font-sans text-xs text-paper/60">{clientName}</span>
      </div>

      {/* 危機橫幅（觸發後持續顯示，不中斷對話） */}
      {hasCrisisFlag && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 space-y-2 flex-shrink-0">
          <p className="font-sans text-xs text-red-700 font-medium">如需即時支援，請撥打：</p>
          <div className="flex gap-2 flex-wrap">
            <a href="tel:28525777" className="text-xs font-sans px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white transition-colors">
              生命熱線 2852 5777
            </a>
            <a href="https://wa.me/85362772234" target="_blank" rel="noopener noreferrer" className="text-xs font-sans px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 transition-colors">
              WhatsApp 行政
            </a>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={chatViewportRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "flex flex-col max-w-[88%]",
              msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            <div
              className={cn(
                "px-4 py-3 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-forest/10 border border-sand/25 text-deep"
                  : "bg-soft/70 border border-sand/15 text-deep"
              )}
            >
              {msg.parts[0].text.split("\n").map((line, i) => (
                <p key={i} className={line.trim() === "" ? "h-2" : "min-h-[1rem]"}>{line}</p>
              ))}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex flex-col mr-auto items-start max-w-[88%]">
            <div className="px-4 py-3 bg-soft/70 border border-sand/15 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-sand rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-sand rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-sand rounded-full animate-bounce" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(inputVal); }}
        className="p-3 border-t border-sand/20 flex gap-2 flex-shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="請輸入你的回答…"
          disabled={isLoading}
          className="flex-1 px-3 py-2 text-sm bg-soft border border-sand/30 placeholder:text-muted/40 outline-none focus:border-forest text-deep transition-colors"
        />
        <button
          type="submit"
          disabled={!inputVal.trim() || isLoading}
          className="px-4 py-2 bg-forest hover:bg-deep text-paper text-sm transition-colors disabled:bg-muted/30 disabled:text-muted disabled:cursor-not-allowed"
        >
          送出
        </button>
      </form>

      <p className="text-center font-sans text-[10px] text-muted/40 pb-2">
        如有緊急情況，請致電澳門生命熱線 2852 5777
      </p>
    </div>
  );
}
