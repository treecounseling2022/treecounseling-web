export type ChatMessage = { role: "user" | "assistant"; parts: { text: string }[] };

const MAX_TURNS = 40;
const MAX_MESSAGE_CHARS = 4000;

// 驗證公開 AI 端點的輸入格式，並限制輪數/長度，避免被拿來當免費 LLM 濫用
export function validateChatMessages(messages: unknown): ChatMessage[] | null {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_TURNS) {
    return null;
  }
  for (const m of messages) {
    if (!m || typeof m !== "object") return null;
    const role = (m as { role?: unknown }).role;
    if (role !== "user" && role !== "assistant") return null;
    const parts = (m as { parts?: unknown }).parts;
    if (!Array.isArray(parts) || parts.length === 0) return null;
    const text = (parts[0] as { text?: unknown } | undefined)?.text;
    if (typeof text !== "string" || text.length === 0 || text.length > MAX_MESSAGE_CHARS) {
      return null;
    }
  }
  return messages as ChatMessage[];
}
