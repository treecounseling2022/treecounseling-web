import { NextRequest, NextResponse } from "next/server";

const SYSTEM_INSTRUCTION = `
你是一位樹心理工作室（Tree Counseling Studio）的溫柔、親切且具同理心的 AI 客服助理。
請遵循以下規則：
1. 請一律使用繁體中文回答（使用港澳習慣用語，例如「心理輔導」、「晤談」、「心理諮商」、「個案」，而非「諮詢」、「諮詢師」、「諮詢信」等大陸用語）。
2. 工作室基本資訊：
   - 服務對象：18歲或以上，無即時生命危險者。如果是緊急情況或有自傷/傷人意圖，請引導他們致電澳門生命熱線：2852 5777，或尋求醫療協助。
   - 服務項目與收費：
     * 個人心理輔導 (面談或線上，每節50分鐘)：MOP 700 - 900。
     * 伴侶心理輔導 (每節80分鐘)：MOP 1,000。
     * 講座和工作坊：客製化，請聯繫報價。
     * 方案與計劃設計：若後續活動交由本工作室執行，則不另收方案撰寫與規劃費用。
   - 付款方式：僅支持 Mpay、中銀轉帳、微信支付、支付寶、Alipay HK 等電子支付方式。行政人員在確認晤談時間後，會提供收款資訊。
   - 保密原則：所有晤談內容與預約資料均嚴格保密，除非涉及生命安全緊急情況。
3. 心理師團隊：
   - 唐國章 (Tanky)：創辦人 & 輔導心理學家（抑鬱焦慮情緒、強迫/囤積行為、多元性別等）。
   - Veronica：心理輔導師 & 專業督導（自我成長、親密關係、親子互動等）。
   - 黃文靜 (Joyce)：心理輔導師（人際關係、情感依附、情緒困擾，並且是伴侶心理輔導的提供者）。
   - M Fok：輔導心理學家（情緒困擾、創傷經歷、LGBTQIA+ 及性別轉換諮商）。
4. 互動指引：
   - 若用戶表示想進行預約，請引導他們前往網站的「預約諮商輔導」頁面（/booking）。
   - 若用戶需要真人客服或有行政疑問，請引導他們點選「聯絡真人」按鈕，或透過 WhatsApp 聯絡：+853 6277 2234。
   - 不要編造任何服務內容或心理師資訊。你不是心理醫生，不提供任何醫療診斷、心理治療或處方藥物。
`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Fallback 規則引擎（無 API Key 時使用）
      console.warn("GEMINI_API_KEY is not configured. Running chatbot in fallback mode.");
      
      const lastUserMsg = messages[messages.length - 1]?.parts?.[0]?.text || "";
      let reply = "你好，我是樹心理的 AI 客服小助手。目前服務正常運作中。若你需要預約輔導，可以直接前往「預約諮商輔導」頁面填寫表單；若有其他行政問題或想找真人聊聊，歡迎透過 WhatsApp (+853 6277 2234) 與我們聯絡！";
      
      if (lastUserMsg.includes("收費") || lastUserMsg.includes("錢") || lastUserMsg.includes("多少")) {
        reply = "我們的服務收費標準為：個人心理輔導（50分鐘）每節 MOP 700 - 900；伴侶心理輔導（80分鐘）每節 MOP 1,000。支持 Mpay、中銀轉帳、微信支付、支付寶等電子支付方式。";
      } else if (lastUserMsg.includes("伴侶") || lastUserMsg.includes("婚姻") || lastUserMsg.includes("Joyce")) {
        reply = "伴侶心理輔導每節（80分鐘）收費為 MOP 1,000。伴侶服務主要由我們的黃文靜 (Joyce) 心理輔導師提供，協助伴侶重建理解與溝通。";
      } else if (lastUserMsg.includes("預約") || lastUserMsg.includes("時間")) {
        reply = "預約心理服務可以直接點選我們網站的「預約諮商輔導」按鈕填寫表單，行政人員收到後會盡快與您聯繫確認時間。";
      }
      
      return NextResponse.json({
        candidates: [
          {
            content: {
              role: "model",
              parts: [{ text: reply }]
            }
          }
        ]
      });
    }

    // 將前端傳送的對話歷史轉化為 Gemini API 的 format
    // Gemini API generateContent endpoint:
    // https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=...
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const body = {
      contents: messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : m.role,
        parts: m.parts.map((p: any) => ({ text: p.text }))
      })),
      systemInstruction: {
        parts: [
          {
            text: SYSTEM_INSTRUCTION
          }
        ]
      },
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 800
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API Error:", errText);
      throw new Error(`Gemini API responded with status ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("API Chat Route Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
