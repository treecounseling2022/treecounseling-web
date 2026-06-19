import { NextResponse } from "next/server";
import { getAuthInfo, isAdminLevel } from "@/lib/auth-role";
import { uploadPDFToDrive } from "@/lib/google-drive";

export async function GET() {
  const auth = await getAuthInfo();
  if (!auth || !isAdminLevel(auth.role)) {
    return NextResponse.json({ error: "未授權" }, { status: 403 });
  }

  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!keyJson) {
    return NextResponse.json({ error: "GOOGLE_SERVICE_ACCOUNT_JSON 未設定" }, { status: 500 });
  }

  // 1. 檢查 JSON 能否解析
  let parsedKey: Record<string, unknown>;
  try {
    parsedKey = JSON.parse(keyJson);
  } catch (e) {
    return NextResponse.json({
      error: "JSON 解析失敗：" + (e instanceof Error ? e.message : String(e)),
      hint: ".env.local 裡不要加單引號或雙引號包住整個 JSON，直接貼原始內容",
    }, { status: 500 });
  }

  // 2. 嘗試上傳測試檔案
  try {
    const testBuffer = Buffer.from("%PDF-1.4 test");
    const url = await uploadPDFToDrive(testBuffer, "_test-connection.pdf", folderId ?? undefined);
    return NextResponse.json({
      ok: true,
      driveUrl: url,
      serviceAccount: parsedKey.client_email,
      folderId: folderId ?? "(未設定，上傳至根目錄)",
    });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : String(e),
      serviceAccount: parsedKey.client_email,
      folderId: folderId ?? "(未設定)",
    }, { status: 500 });
  }
}
