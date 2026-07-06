import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_INSTRUCTION } from "@/config/chat-prompt";
import { validateChatMessages } from "@/lib/ai-chat-guard";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = validateChatMessages(body.messages);

    if (!messages) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // ── Claude (Anthropic) — primary ───────────────────────────────────────────
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
            max_tokens: 600,
            system: SYSTEM_INSTRUCTION,
            messages: messages.map((m: { role: string; parts: { text: string }[] }) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.parts[0]?.text ?? "",
            })),
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("Claude API Error:", errText, "— falling back to Gemini");
        } else {
          const data = await response.json();
          const replyText = data.content?.[0]?.text ?? "";
          return NextResponse.json({
            candidates: [{ content: { parts: [{ text: replyText }] } }],
          });
        }
      } catch (claudeErr) {
        console.error("Claude request failed, falling back to Gemini:", claudeErr);
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
          generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Gemini API Error:", errText);
        throw new Error(`Gemini API responded with status ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    // ── 無 API Key，基本 fallback ────────────────────────────────────────────────
    const lastMsg = messages[messages.length - 1]?.parts?.[0]?.text ?? "";
    let reply = "你好！我是樹心理的 AI 客服助理。有任何關於心理輔導服務的問題，歡迎直接詢問。如需真人協助，可透過 WhatsApp (+853 6277 2234) 聯絡我們。";

    if (/收費|費用|多少|價錢|價格/.test(lastMsg)) {
      reply = "我們的收費如下：個人輔導（50分鐘）MOP 700–900；伴侶輔導（80分鐘）MOP 1,000。付款方式支持 Mpay、微信支付、支付寶、中銀轉帳等電子支付。";
    } else if (/預約|約/.test(lastMsg)) {
      reply = "預約輔導服務，請點選網站上方的「預約諮商輔導」按鈕填寫表單，行政人員收到後會盡快與您聯繫確認時間。";
    } else if (/伴侶|婚姻|感情|關係/.test(lastMsg)) {
      reply = "伴侶心理輔導每節80分鐘，收費 MOP 1,000，主要由黃文靜（Joyce）心理輔導師提供，協助伴侶改善溝通與關係。";
    } else if (/線上|網上|視頻|視訊/.test(lastMsg)) {
      reply = "我們提供線上心理輔導服務，透過視訊進行，每節50分鐘，收費與面談相同（MOP 700–900）。";
    }

    return NextResponse.json({
      candidates: [{ content: { parts: [{ text: reply }] } }],
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API Chat Route Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
