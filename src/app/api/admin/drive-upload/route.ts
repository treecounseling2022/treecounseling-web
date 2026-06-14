import { NextRequest, NextResponse } from "next/server";
import { createSign } from "crypto";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const SA_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const SA_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

function buildJWT(email: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  })).toString("base64url");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(privateKey, "base64url");
  return `${header}.${payload}.${sig}`;
}

async function getAccessToken(email: string, privateKey: string): Promise<string> {
  const jwt = buildJWT(email, privateKey);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json() as { access_token?: string; error?: string };
  if (!data.access_token) {
    throw new Error(`Google token 取得失敗：${data.error ?? "unknown"}`);
  }
  return data.access_token;
}

export async function POST(req: NextRequest) {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  if (!DRIVE_FOLDER_ID || !SA_EMAIL || !SA_KEY) {
    return NextResponse.json({
      error: "Google Drive 尚未設定。請在 .env.local 設定 GOOGLE_DRIVE_FOLDER_ID、GOOGLE_SERVICE_ACCOUNT_EMAIL、GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY。",
    }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const filename = (formData.get("filename") as string | null) ?? "inquiry.html";

  if (!file) {
    return NextResponse.json({ error: "未提供檔案" }, { status: 400 });
  }

  const token = await getAccessToken(SA_EMAIL, SA_KEY);
  const bytes = await file.arrayBuffer();

  // Multipart upload to Google Drive
  const boundary = "----TreeCounselingBoundary";
  const meta = JSON.stringify({
    name: filename,
    parents: [DRIVE_FOLDER_ID],
    mimeType: file.type || "text/html",
  });

  const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`;
  const filePart = `--${boundary}\r\nContent-Type: ${file.type || "text/html"}\r\n\r\n`;
  const ending = `\r\n--${boundary}--`;

  const metaBytes = new TextEncoder().encode(metaPart);
  const filePartBytes = new TextEncoder().encode(filePart);
  const endBytes = new TextEncoder().encode(ending);
  const fileBytes = new Uint8Array(bytes);

  const body = new Uint8Array(
    metaBytes.length + filePartBytes.length + fileBytes.length + endBytes.length
  );
  let offset = 0;
  body.set(metaBytes, offset); offset += metaBytes.length;
  body.set(filePartBytes, offset); offset += filePartBytes.length;
  body.set(fileBytes, offset); offset += fileBytes.length;
  body.set(endBytes, offset);

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(body.length),
      },
      body,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    return NextResponse.json({ error: `Drive 上傳失敗：${err}` }, { status: 500 });
  }

  const result = await uploadRes.json() as { id: string; name: string };
  return NextResponse.json({
    success: true,
    file_id: result.id,
    file_name: result.name,
    url: `https://drive.google.com/file/d/${result.id}/view`,
  });
}
