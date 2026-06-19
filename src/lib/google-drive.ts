import { google } from "googleapis";
import type { drive_v3 } from "googleapis";

function getDriveClient() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");

  const key = JSON.parse(keyJson);
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

// 找出或建立個案專屬資料夾（在主資料夾內以個案姓名命名）
async function getOrCreateClientFolder(
  drive: drive_v3.Drive,
  clientName: string,
  parentFolderId: string
): Promise<string> {
  const safeName = clientName.replace(/[/\\?%*:|"<>]/g, "_");

  // 先搜尋是否已有同名資料夾
  const { data: search } = await drive.files.list({
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    q: `name='${safeName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    pageSize: 1,
  });

  if (search.files && search.files.length > 0 && search.files[0].id) {
    return search.files[0].id;
  }

  // 不存在則建立
  const { data: folder } = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: safeName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
  });

  if (!folder.id) throw new Error("Failed to create client folder in Drive");
  return folder.id;
}

export async function uploadPDFToDrive(
  pdfBuffer: Buffer,
  fileName: string,
  rootFolderId?: string,
  clientName?: string
): Promise<string> {
  const drive = getDriveClient();
  const { Readable } = await import("stream");

  // 若有 rootFolderId + clientName，放進個案子資料夾
  let targetFolderId = rootFolderId;
  if (rootFolderId && clientName) {
    targetFolderId = await getOrCreateClientFolder(drive, clientName, rootFolderId);
  }

  const { data } = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: fileName,
      mimeType: "application/pdf",
      parents: targetFolderId ? [targetFolderId] : undefined,
    },
    media: {
      mimeType: "application/pdf",
      body: Readable.from(pdfBuffer),
    },
    fields: "id, webViewLink",
  });

  if (!data.id) throw new Error("Drive upload failed: no file ID returned");

  await drive.permissions.create({
    supportsAllDrives: true,
    fileId: data.id,
    requestBody: { role: "reader", type: "anyone" },
  }).catch(() => {/* 共用雲端硬碟可能由硬碟設定控制權限 */});

  return data.webViewLink ?? `https://drive.google.com/file/d/${data.id}/view`;
}
