import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateClientPDF } from "@/lib/generate-client-pdf";

const resend = new Resend(process.env.RESEND_API_KEY);

const SYSTEM_INSTRUCTION = `
你是一位樹心理工作室（Tree Counseling Studio）的 AI 初談助理。
你的唯一任務是在個案首次晤談前，透過結構化的對話蒐集背景資料，協助心理師更快了解個案。

【邊界守則——必須嚴格遵守】
- 你只能進行初談資料蒐集，不做任何其他事情。
- 若個案問與初談無關的問題（例如：功課、一般知識、食譜、時事、心理學理論等），請溫和但清楚地拒絕，回覆：「這個問題超出了我作為初談助理的範圍。我在這裡只是陪你梳理預約前的狀況，有其他問題可以直接聯絡行政。」然後繼續引導回初談流程。
- 你不作診斷、不分析心理狀態、不給治療建議、不解釋心理學概念。
- 你不是心理師，也不模擬諮商對話。

【基本設定】
- 語言：繁體中文，港澳用語（「心理輔導」、「晤談」、「個案」）。
- 語氣：溫柔、耐心、不評判。每次只問一個問題。
- 格式：只用純文字，禁止 **粗體**、# 標題、- 列表符號。

【初談流程，共 7 輪】

第 1 輪（主訴）
溫柔歡迎個案，說明這次對話的目的是讓心理師在見面前更了解他。
請個案用自己的話說說：「是什麼讓你決定來尋求心理輔導？」
不引導、不給選項，讓個案自由表達。

第 2 輪（困擾起源）
根據個案所說，溫和地請他多說一點：
這個困擾是從什麼時候開始的？那段時間有沒有發生什麼特別的事情？

第 3 輪（功能影響）
詢問困擾對日常生活的影響：
這些困擾有影響到你的睡眠、飲食、工作，或與身邊人的關係嗎？哪方面影響比較大？

第 4 輪（危機評估）⚠️ 必問，不可跳過，不可改變措辭
溫和但直接地詢問：
「在這段困難的時間裡，你有沒有出現過想傷害自己、或不想活下去的念頭？」

→ 若個案明確表示有自傷或自殺意念：
  先溫柔回應，提供危機資源，然後在回覆末尾加上 [CRISIS_FLAG]。
  回覆內容：「謝謝你願意告訴我這件事，這需要馬上得到支持。請你現在撥打澳門生命熱線 2852 5777，或聯繫身邊信任的人。我們的心理師也很希望能陪伴你，你今天預約了這一步已經很勇敢。如果你願意，我們可以繼續完成剩下的問題，心理師會盡快聯絡你。[CRISIS_FLAG]」
  然後繼續第 5 輪，不中斷流程。

→ 若個案回答「沒有」或「沒有想過」：繼續第 5 輪。

第 5 輪（精神科就診史）
詢問精神科相關經歷，語氣保持輕鬆自然，不帶任何評判：
「你有沒有曾經去看過精神科醫生，或者在醫院、診所有接受過相關的情緒或心理評估？」

→ 若個案表示有就診經歷，繼續追問以下三點（合併在同一回覆中溫和提出）：
  「可以告訴我是在哪裡就診嗎（例如醫院名稱或私家診所）？醫生有沒有給你任何診斷？目前有沒有在服用精神科藥物？」

→ 若個案表示從未就診：記錄「無精神科就診史」，直接進入第 6 輪。

第 6 輪（心理輔導史與支持系統）
詢問兩件事，合併在一個問題：
（a）過往有沒有接受過心理輔導或諮商？如有，大致是什麼情況（在哪裡、持續多久）？
（b）目前生活中有沒有支持你的人（家人、朋友等）？

第 7 輪（求助目標，產出摘要）
詢問：「如果輔導進展順利，你希望自己有什麼改變？或者你最希望在這段輔導中得到什麼？」
收到回答後，溫柔地感謝個案，告知已完成資料蒐集，心理師很快會看到這份資料。
然後在回覆末尾輸出摘要。

【摘要格式】
[SUMMARY_START]
【主訴】個案用自己的話表達的主要困擾
【困擾描述與發展】困擾的起源、觸發事件、發展脈絡
【功能影響】睡眠、飲食、工作、人際等受影響情況
【危機評估】無自傷意念 / 有自傷意念（已提供危機資源並繼續初談）
【精神科就診史】就診機構、確診診斷（如有）/ 無就診史
【用藥狀況】目前服用中的精神科藥物（藥名/類型）/ 無用藥 / 未提及
【心理輔導史】曾接受輔導的機構、時長、結束原因（如有）/ 無輔導史
【支持系統】目前身邊的支持資源
【求助目標】個案希望從輔導中獲得什麼
【困擾分類】（從以下選擇，可多選）情緒困擾 / 自我探索 / 家庭關係 / 伴侶關係 / 親子關係 / 工作壓力 / 學業生涯 / 人際關係 / 成癮問題 / 其他
[SUMMARY_END]
`;

// ── GET：驗證 token，回傳個案姓名 ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const db = createAdminClient();
  const { data: client, error } = await db
    .from("clients")
    .select("id, full_name, intake_submitted_at")
    .eq("intake_token", token)
    .maybeSingle();

  if (error || !client) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

  return NextResponse.json({
    clientName: client.full_name,
    alreadySubmitted: !!client.intake_submitted_at,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { messages, token, action } = await req.json();

    // ── 提交摘要：寫入 clients 表並通知行政 ────────────────────────────────────
    if (action === "submit" && token) {
      const summary = messages as string;
      const db = createAdminClient();

      const { data: client, error } = await db
        .from("clients")
        .update({
          intake_summary: summary,
          intake_submitted_at: new Date().toISOString(),
        })
        .eq("intake_token", token)
        .select("id, full_name, email, assigned_therapist_id")
        .single();

      if (error || !client) {
        return NextResponse.json({ error: "Invalid token" }, { status: 404 });
      }

      // PDF + 通知行政 + 心理師（背景執行，不阻擋回應）
      const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@treecounseling.com";
      const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL ?? "admin@treecounseling.com";

      if (process.env.RESEND_API_KEY) {
        generateClientPDF(client.id, "初談資料")
          .then(async ({ pdfBuffer, fileName, driveUrl }) => {
            const driveNote = driveUrl
              ? `<p style="margin:12px 0 0;font-size:12px;color:#888">Drive：<a href="${driveUrl}" style="color:#2d4a38">${driveUrl}</a></p>`
              : "";

            const bodyHtml = `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;font-size:14px;line-height:1.75">
                <div style="background:#2d4a38;padding:20px 28px">
                  <p style="margin:0;color:#a8c5b0;font-size:11px;letter-spacing:1.5px">TREE COUNSELING STUDIO</p>
                  <p style="margin:4px 0 0;color:#fff;font-size:17px;font-weight:600">AI 初談資料 — ${client.full_name}</p>
                </div>
                <div style="background:#fff;padding:24px 28px">
                  <p style="margin:0 0 12px;color:#444">個案已完成 AI 初談，詳細摘要請見附件 PDF。</p>
                  <pre style="white-space:pre-wrap;font-family:sans-serif;font-size:13px;color:#333;line-height:1.8;background:#f7f5ef;padding:16px;border-left:3px solid #5a8a6a">${summary}</pre>
                  ${driveNote}
                </div>
                <div style="background:#f7f5ef;padding:12px 28px;text-align:center">
                  <p style="margin:0;color:#999;font-size:11px">樹心理工作室 Tree Counseling Studio — AI 初談系統</p>
                </div>
              </div>
            `;

            const attachment = { filename: fileName, content: pdfBuffer };

            // 寄行政
            const sends = [
              resend.emails.send({
                from: FROM,
                to: ADMIN_EMAIL,
                subject: `【初談資料】${client.full_name}`,
                html: bodyHtml,
                attachments: [attachment],
              }),
            ];

            // 寄心理師（如有派案）
            const assignedId = (client as typeof client & { assigned_therapist_id?: string | null }).assigned_therapist_id;
            if (assignedId) {
              const { data: therapist } = await db
                .from("therapist_profiles")
                .select("email, name")
                .eq("id", assignedId)
                .single();
              if (therapist?.email) {
                sends.push(
                  resend.emails.send({
                    from: FROM,
                    to: therapist.email,
                    subject: `【初談資料】${client.full_name}`,
                    html: bodyHtml,
                    attachments: [attachment],
                  })
                );
              }
            }

            await Promise.all(sends);
          })
          .catch(console.error);
      }

      return NextResponse.json({ ok: true });
    }

    // ── 一般對話 ───────────────────────────────────────────────────────────────
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // Claude（主要）
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

        if (response.ok) {
          const data = await response.json();
          const replyText = data.content?.[0]?.text ?? "";
          return NextResponse.json({
            candidates: [{ content: { parts: [{ text: replyText }] } }],
          });
        }
        console.error("Claude Intake API Error — falling back to Gemini");
      } catch (err) {
        console.error("Claude Intake request failed:", err);
      }
    }

    // Gemini（備用）
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
        console.error("Gemini Intake API Error:", errText);
        throw new Error(`Gemini API responded with status ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "No AI API key configured" }, { status: 503 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API Intake Route Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
