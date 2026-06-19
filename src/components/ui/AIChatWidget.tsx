"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  parts: { text: string }[];
}

function renderInline(line: string) {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

const SHORTCUT_QUESTIONS = [
  "伴侶輔導收費多少？",
  "如何付款與付款方式？",
  "心理輔導真的有用嗎？",
  "我想預約輔導服務",
];

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初始化時顯示歡迎語
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          parts: [
            {
              text: "你好，我是樹心理的 AI 小助手。你可以向我諮詢關於我們的輔導項目、收費標準、付款方式等常見問題。如果需要，也可以隨時點選下方的「聯絡真人」與行政人員直接對話喔！",
            },
          ],
        },
      ]);
    }
  }, [messages]);

  // 捲動到最底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      role: "user",
      parts: [{ text }],
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputVal("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) throw new Error("傳送失敗");

      const data = await res.json();
      const replyText =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "抱歉，我現在無法回答這個問題。您可以直接前往「預約諮商輔導」或透過 WhatsApp 聯絡真人客服。";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          parts: [{ text: replyText }],
        },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          parts: [
            {
              text: "線路似乎有些忙碌，請稍後再試。或者，您也可以直接點選「聯絡真人」按鈕以 WhatsApp 聯絡行政查詢。",
            },
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans print:hidden">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="absolute bottom-18 right-0 w-[350px] sm:w-[400px] h-[520px] bg-paper/95 backdrop-blur-md border border-sand/30 shadow-2xl flex flex-col overflow-hidden isolate"
          >
            {/* Header */}
            <div className="bg-forest px-4 py-3 flex items-center justify-between text-paper">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-serif text-sm font-medium tracking-wide">樹心理 AI 小助手</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-paper/80 hover:text-paper transition-colors p-1 cursor-pointer"
                aria-label="Close Chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div
                    className={cn(
                      "px-3.5 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-forest/10 border border-sand/30 text-deep"
                        : "bg-soft/70 border border-sand/15 text-deep"
                    )}
                  >
                    {msg.parts[0].text.split("\n").map((line, lIdx) => (
                      <p key={lIdx} className={cn(line.trim() === "" ? "h-2" : "min-h-[1rem]")}>
                        {renderInline(line)}
                      </p>
                    ))}

                    {/* 當 AI 的回覆提到需要聯絡真人、或者本來就是 AI 角色時，附加快捷跳轉 */}
                    {msg.role === "assistant" &&
                      (msg.parts[0].text.includes("WhatsApp") ||
                        msg.parts[0].text.includes("客服") ||
                        msg.parts[0].text.includes("真人")) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            href="https://wa.me/85362772234"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-paper text-xs transition-colors rounded-sm"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.63-1.023-5.102-2.884-6.964C16.592 1.963 14.12 .94 11.49.94c-5.438 0-9.863 4.42-9.866 9.863-.001 1.702.461 3.361 1.337 4.815l-1.006 3.673 3.754-.985zm12.59-6.386c-.33-.165-1.951-.963-2.254-1.074-.303-.11-.523-.165-.743.165-.22.33-.853 1.074-1.046 1.294-.193.22-.385.248-.715.083-.33-.165-1.393-.513-2.653-1.637-.98-.874-1.642-1.953-1.834-2.282-.193-.33-.02-.508.145-.671.148-.147.33-.385.495-.578.165-.192.22-.33.33-.55.11-.22.055-.413-.028-.578-.083-.165-.743-1.79-1.019-2.45-.268-.644-.542-.556-.743-.566-.19-.01-.41-.01-.628-.01s-.573.082-.871.407c-.297.325-1.134 1.109-1.134 2.703 0 1.593 1.157 3.125 1.319 3.345.162.22 2.277 3.477 5.517 4.88.77.331 1.37.53 1.839.678.775.246 1.48.212 2.037.13.62-.092 1.951-.798 2.227-1.57.275-.77.275-1.43.192-1.569-.083-.138-.303-.22-.633-.385z" />
                          </svg>
                          聯絡真人 WhatsApp
                        </a>
                        <Link
                          href="/booking"
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-forest hover:bg-deep text-paper text-xs transition-colors rounded-sm"
                        >
                          前往預約諮商輔導 →
                        </Link>
                      </div>
                    )}
                </div>
              </div>
              ))}
              {isLoading && (
                <div className="flex flex-col mr-auto items-start max-w-[85%]">
                  <div className="px-3.5 py-2.5 text-sm bg-soft/75 border border-sand/15 text-deep flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-sand rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-sand rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-sand rounded-full animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Shortcut Questions */}
            {messages.length === 1 && !isLoading && (
              <div className="px-4 py-2 border-t border-sand/10 bg-transparent flex flex-wrap gap-2">
                {SHORTCUT_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="text-[11px] font-sans px-2.5 py-1.5 bg-paper hover:bg-soft border border-sand/20 text-muted hover:text-forest transition-all cursor-pointer rounded-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(inputVal);
              }}
              className="p-3 border-t border-sand/20 bg-paper/90 flex gap-2"
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="請輸入您的問題..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 text-sm bg-soft border border-sand/35 placeholder:text-muted/40 outline-none focus:border-forest text-deep transition-all rounded-none"
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || isLoading}
                className="px-4 py-2 bg-forest hover:bg-deep text-paper text-sm transition-colors cursor-pointer flex items-center justify-center disabled:bg-muted/30 disabled:text-muted disabled:cursor-not-allowed"
              >
                傳送
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <div className="flex flex-col items-center gap-1.5">
        {!isOpen && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-sans text-[10px] text-paper bg-forest/80 px-2 py-0.5 rounded-full shadow whitespace-nowrap"
          >
            AI 客服
          </motion.span>
        )}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 bg-forest text-paper shadow-xl rounded-full flex items-center justify-center cursor-pointer border-2 border-paper/20 relative"
          aria-label="Toggle AI Assistant"
        >
          <AnimatePresence mode="wait">
            {!isOpen ? (
              <motion.div
                key="chat-icon"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {/* Chat bubble with sparkle — clearly AI customer service */}
                <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                  <path
                    d="M4 6C4 4.895 4.895 4 6 4H22C23.105 4 24 4.895 24 6V18C24 19.105 23.105 20 22 20H8L4 24V6Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <circle cx="10" cy="13" r="1.2" fill="currentColor" />
                  <circle cx="14" cy="13" r="1.2" fill="currentColor" />
                  <circle cx="18" cy="13" r="1.2" fill="currentColor" />
                  {/* Sparkle top-right */}
                  <path d="M19 7 L19.5 8.5 L21 7 L19.5 5.5 Z" fill="currentColor" opacity="0.7" />
                </svg>
              </motion.div>
            ) : (
              <motion.div
                key="close-icon"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Online indicator dot */}
          {!isOpen && (
            <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-emerald-400 border-2 border-paper rounded-full" />
          )}
        </motion.button>
      </div>
    </div>
  );
}
