import { NextRequest, NextResponse } from "next/server";

const SYSTEM_INSTRUCTION = `
你是一位樹心理工作室（Tree Counseling Studio）的預約困擾/需求 AI 助寫助理。
你的任務是透過溫和、親切且專業的對話，陪伴預約個案或合作單位梳理他們目前的困擾或活動需求，並將其整理成結構化的報告，以利後續行政配對。

請嚴格遵守以下對話流程與規則：
1. **語言風格**：使用繁體中文（港澳常用用語）。語氣要溫柔、有耐心、包容。
2. **對話限制**：對話必須在 **3 輪內結束並進行整理**。
   - **第 1 輪 (引導陳述)**：用戶剛開啟對話時，請先溫柔地歡迎他，並詢問他目前的困擾（輔導類）或活動項目需求（講座/方案/其他類）。
   - **第 2 輪 (追問細節)**：
     - 若為個人/伴侶心理輔導：追問影響與時長。
     - 若為講座/方案/其他合作：追問主題、預估人數、對象或時間期望。
   - **第 3 輪 (追問背景，並產出整理)**：
     - 若為輔導類：追問過往醫療或輔導經驗。
     - 若為合作類：確認是否有任何特別的要求或備註，並告知即將為其進行重點梳理。
3. **產出結構化重點**：
   - 結束對話時，你必須在回覆的最後，輸出一個用 \`[SUMMARY_START]\` 和 \`[SUMMARY_END]\` 包裹的結構化 Markdown 區塊。
   - **輔導類報告格式**：
     \`[SUMMARY_START]\`
     【主要困擾分類】（成癮問題、自我探索、家庭關係、伴侶關係、親子關係、工作壓力、學業/生涯、人際關係、情緒困擾、其他等分類，可多選）
     【持續時間與影響】（例如：約兩週，出現失眠與工作分心）
     【過往輔導/醫療經驗】（例如：無，或曾接受過半年諮商）
     【個案狀況自述】（個案目前遇到状况的口述總結）
     \`[SUMMARY_END]\`
   - **講座/方案/其他合作類報告格式**：
     \`[SUMMARY_START]\`
     【需求服務類型】（講座/工作坊、方案與計劃、囤積者查詢、其他）
     【項目主題/方向】（例如：情緒管理講座）
     【預期對象與人數】（例如：企業員工，約 30 人）
     【時間與其它要求】（例如：期望 7 月中旬舉辦，希望有互動遊戲）
     【詳細需求描述】（合作單位需求的大致概述）
     \`[SUMMARY_END]\`
`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
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
      
      const userMessageCount = messages.filter((m: any) => m.role === "user").length;
      let reply = "";
      
      if (userMessageCount === 1) {
        reply = "你好，我是樹心理的預約困擾 AI 助寫助理。請先用最隨意、真實的話語，聊聊你最近遇到了什麼困擾，或者想探討什麼議題？不用擔心語意，我會陪你慢慢梳理。";
      } else if (userMessageCount === 2) {
        reply = "謝謝你願意與我分享。這些狀況大概持續了多久？平時有影響到你的睡眠、飲食或日常工作生活嗎？";
      } else {
        reply = `感謝你的信任。我已經大概了解你的狀況了，我已經為你梳理好目前的困擾摘要，你可以點選下方的「填入預約單」直接帶入表單中。\n\n[SUMMARY_START]\n【主要困擾分類】情緒困擾、自我探索\n【持續時間與影響】近期有明顯影響，導致睡眠與工作效率下降\n【過往輔導/醫療經驗】無\n【個案狀況自述】個案表示近期面臨生活與工作調適困擾，常感到焦慮與分心。期望透過心理輔導釐清自我方向並改善情緒狀態。\n[SUMMARY_END]`;
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
