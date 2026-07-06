import { NextRequest, NextResponse } from "next/server";
import { validateChatMessages } from "@/lib/ai-chat-guard";

const SYSTEM_INSTRUCTION = `
你是一位樹心理工作室（Tree Counseling Studio）的預約 AI 助寫助理。
你的任務是陪伴用戶用最自然的方式說清楚他們的困擾，協助他們完成預約表單的「困擾描述」欄位。

規則：
1. 語言：繁體中文，港澳用語（「心理輔導」、「晤談」），不用大陸用語。
2. 語氣：溫柔、不評判、簡短親切。
3. 對話限制：最多 3 輪即整理摘要，不拖長。
4. 格式：只用純文字，禁止 **粗體**、# 標題、- 列表符號。
5. 你不作診斷、不給建議，只幫助用戶「說出口」。

流程：
第 1 輪：歡迎，請用戶用自己的話說說最近遇到什麼困擾，不需要格式，隨意表達即可。
第 2 輪：根據用戶所說，溫和地追問一個最重要的細節（例如持續多久、最困擾的部分是什麼）。
第 3 輪：感謝用戶分享，告知將整理摘要，並在回覆末尾輸出摘要。

摘要格式：（用自然流暢的語氣，簡短整理，不要病歷式標籤，像朋友複述一樣）
[SUMMARY_START]
（2-3句話，用個案自己的話大致說清楚困擾是什麼、大概多久了、對生活有什麼影響）
[SUMMARY_END]
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = validateChatMessages(body.messages);

    if (!messages) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // ── Claude (primary) ────────────────────────────────────────────────────────
    if (anthropicKey) {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 800,
            system: SYSTEM_INSTRUCTION,
            messages: messages.map((m: { role: string; parts: { text: string }[] }) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.parts[0]?.text ?? "",
            })),
          }),
        });

        if (!response.ok) {
          console.error("Claude Assist API Error — falling back to Gemini");
        } else {
          const data = await response.json();
          const replyText = data.content?.[0]?.text ?? "";
          return NextResponse.json({
            candidates: [{ content: { parts: [{ text: replyText }] } }],
          });
        }
      } catch (err) {
        console.error("Claude Assist request failed, falling back to Gemini:", err);
      }
    }

    // ── Gemini (fallback) ───────────────────────────────────────────────────────
    if (geminiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: messages.map((m: { role: string; parts: { text: string }[] }) => ({
            role: m.role === "assistant" ? "model" : m.role,
            parts: m.parts.map((p) => ({ text: p.text })),
          })),
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Gemini Assist API Error:", errText);
        throw new Error(`Gemini API responded with status ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    // ── 規則引擎 fallback（兩個 key 都沒有時）──────────────────────────────────
    {
      console.warn("No AI API key configured for assist. Running fallback simulator.");
      
      const userMessageCount = messages.filter((m: { role: string }) => m.role === "user").length;
      let reply = "";

      if (userMessageCount === 1) {
        reply = "你好，我是樹心理的 AI 助寫助理。請用最隨意的話，說說你最近遇到了什麼困擾？不用擔心格式，我會陪你慢慢梳理。";
      } else if (userMessageCount === 2) {
        reply = "謝謝你的分享。這些狀況大概持續了多久？有沒有影響到你的睡眠或日常生活？";
      } else {
        reply = `謝謝你告訴我這些。我已為你整理好一段簡短描述，你可以點選下方「填入預約單」帶入表單。\n\n[SUMMARY_START]\n【主要困擾】個案表示近期面臨生活與情緒上的困擾，希望透過心理輔導獲得支持。\n【持續時間與影響】近期有明顯影響，導致生活節奏受到干擾。\n[SUMMARY_END]`;
      }

      return NextResponse.json({
        candidates: [{ content: { parts: [{ text: reply }] } }],
      });
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API Assist Route Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
