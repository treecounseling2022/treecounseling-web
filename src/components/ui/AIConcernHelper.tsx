"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  parts: { text: string }[];
}

interface AIConcernHelperProps {
  onComplete: (structuredText: string) => void;
  serviceType: string;
}

export default function AIConcernHelper({ onComplete, serviceType }: AIConcernHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatViewportRef = useRef<HTMLDivElement>(null);

  // 當開啟 Modal 時重設對話
  useEffect(() => {
    if (isOpen) {
      let initialPrompt = "你好，我是樹心理的 AI 小助手。在這裡，你可以用最隨意、真實的文字，聊聊你最近遇到了什麼困擾，或者想探討什麼議題？不用擔心格式，我會陪你慢慢梳理。";
      
      if (serviceType === "couple") {
        initialPrompt = "你好，我是樹心理的 AI 小助手。得知你們目前正在考慮伴侶心理輔導，這是一段需要雙方共同面對的旅程。請你們用最自然、真實的話語，聊聊你們兩個人最近面臨的最主要困擾是什麼？";
      } else if (serviceType === "workshop") {
        initialPrompt = "你好，我是樹心理的 AI 小助手。得知您對我們的講座或工作坊感興趣。請簡單告訴我，您希望舉辦的主題、大約的日期，或預計的對象是誰？";
      } else if (serviceType === "proposal") {
        initialPrompt = "你好，我是樹心理的 AI 小助手。得知您需要方案或計劃撰寫。請簡單告訴我，您目前的項目方向、服務對象是誰，以及大約何時需要完成？";
      } else if (serviceType === "hoarding") {
        initialPrompt = "你好，我是樹心理的 AI 小助手。得知您需要囤積者輔導查詢。請簡單描述您或身邊人目前物品堆積的狀況，以及希望獲得什麼樣的協助？";
      } else if (serviceType === "other") {
        initialPrompt = "你好，我是樹心理的 AI 小助手。請簡單告訴我您這次預約或查詢的主要事由？";
      }
      
      setMessages([
        {
          role: "assistant",
          parts: [{ text: initialPrompt }],
        },
      ]);
      setSummaryText(null);
      setInputVal("");
    }
  }, [isOpen, serviceType]);

  // 只滾動聊天容器，不影響頁面位置
  useEffect(() => {
    const vp = chatViewportRef.current;
    if (vp) vp.scrollTop = vp.scrollHeight;
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
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) throw new Error("API request failed");

      const data = await res.json();
      const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // 檢查回覆中是否含有 [SUMMARY_START] 和 [SUMMARY_END] 標籤
      const match = replyText.match(/\[SUMMARY_START\]([\s\S]*?)\[SUMMARY_END\]/);
      const parsedSummary = match ? match[1].trim() : null;
      const displayReply = replyText
        .replace(/\[SUMMARY_START\][\s\S]*?\[SUMMARY_END\]/, "")
        .trim();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          parts: [{ text: displayReply || "我已為你整理好摘要，請確認以下內容：" }],
        },
      ]);

      if (parsedSummary) setSummaryText(parsedSummary);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          parts: [
            { text: "抱歉，整理過程中出現了一些連線狀況，但你剛才輸入的內容已經被安全記錄。你可以關閉本視窗並手動填寫，或者稍後再試。" },
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (summaryText) {
      onComplete(summaryText);
      setIsOpen(false);
    }
  };

  // 用戶輸入的輪次
  const userMessageCount = messages.filter((m) => m.role === "user").length;

  return (
    <>
      {/* 喚起 AI 助手的宣紙標籤小按鈕 */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-forest/5 hover:bg-forest/10 border border-sand/30 hover:border-forest/40 text-xs font-sans text-muted hover:text-forest transition-all duration-300 cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        📝 讓 AI 協助我整理困擾
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-sans">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-deep/40 backdrop-blur-xs"
            />

            {/* Dialog Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-lg h-[550px] bg-paper/95 backdrop-blur-md border border-sand/30 shadow-2xl flex flex-col overflow-hidden isolate"
            >
              {/* Header */}
              <div className="bg-forest px-6 py-4 flex items-center justify-between text-paper">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 113.536 0V21h2v-2.1c.365-.13.71-.31 1.02-.54l1.4 1.4 1.4-1.4-1.4-1.4a5.006 5.006 0 00-.77-4.96z" />
                  </svg>
                  <span className="font-serif text-sm font-medium tracking-wide">預約困擾 AI 助寫助理</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-paper/85 hover:text-paper transition-colors p-1 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Chat Viewport */}
              <div ref={chatViewportRef} className="flex-1 overflow-y-auto p-6 space-y-5 bg-transparent">
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
                        "px-4 py-3 text-sm leading-relaxed shadow-xs",
                        msg.role === "user"
                          ? "bg-forest/10 border border-sand/30 text-deep"
                          : "bg-soft/70 border border-sand/15 text-deep"
                      )}
                    >
                      {msg.parts[0].text.split("\n").map((line, lIdx) => (
                        <p key={lIdx} className={cn(line.trim() === "" ? "h-2" : "min-h-[1rem]")}>
                          {renderBold(line)}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Loading Bubble */}
                {isLoading && (
                  <div className="flex flex-col mr-auto items-start max-w-[85%]">
                    <div className="px-4 py-3 text-sm bg-soft/70 border border-sand/15 text-deep flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-sand rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-sand rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-sand rounded-full animate-bounce" />
                    </div>
                  </div>
                )}

                {/* 結構化摘要報告預覽與確認填入 */}
                {summaryText && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 border border-forest/30 bg-forest/5 space-y-4 shadow-sm"
                  >
                    <h4 className="font-serif text-deep text-sm font-semibold border-b border-forest/20 pb-2">
                      📋 AI 整理出的困擾摘要報告
                    </h4>
                    <div className="text-xs text-muted/95 leading-relaxed space-y-2 select-text whitespace-pre-wrap font-sans">
                      {summaryText}
                    </div>
                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={handleApply}
                        className="flex-1 py-2 bg-forest hover:bg-deep text-paper text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 font-medium"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        填入預約單
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 border border-sand/30 hover:bg-soft text-xs text-muted transition-colors cursor-pointer"
                      >
                        取消
                      </button>
                    </div>
                  </motion.div>
                )}

              </div>

              {/* Input Footer */}
              {!summaryText && (
                <div className="p-4 border-t border-sand/15 bg-paper/90 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(inputVal); } }}
                      placeholder={
                        isLoading
                          ? "整理中..."
                          : userMessageCount >= 2
                          ? "請輸入回答（或直接輸入：請幫我整理）"
                          : "請寫下您的回答..."
                      }
                      disabled={isLoading}
                      className="flex-1 px-3 py-2.5 text-sm bg-soft border border-sand/35 placeholder:text-muted/40 outline-none focus:border-forest text-deep transition-all rounded-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSend(inputVal)}
                      disabled={!inputVal.trim() || isLoading}
                      className="px-5 py-2.5 bg-forest hover:bg-deep text-paper text-sm transition-colors cursor-pointer disabled:bg-muted/30 disabled:text-muted disabled:cursor-not-allowed font-medium"
                    >
                      送出
                    </button>
                  </div>
                  <p className="text-xs text-muted/40 text-center leading-relaxed">
                    AI 助理會問 2-3 個問題，協助你整理困擾描述後自動填入表單。
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}
