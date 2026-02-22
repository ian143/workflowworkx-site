const MS_AUTH_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MS_TOKEN_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

interface MsTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface OneDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
}

export function getOneDriveAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: "Files.Read.All offline_access User.Read",
    response_mode: "query",
  });

  return `${MS_AUTH_URL}?${params.toString()}`;
}

export async function exchangeOneDriveCode(
  code: string,
  redirectUri: string
): Promise<MsTokens> {
  const response = await fetch(MS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const detail = data.error_description || data.error || response.statusText;
    throw new Error(`OneDrive token exchange failed: ${detail}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshOneDriveToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const response = await fetch(MS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const detail = data.error_description || data.error || response.statusText;
    throw new Error(`OneDrive token refresh failed: ${detail}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function listFolderFiles(
  accessToken: string,
  folderId: string
): Promise<OneDriveFile[]> {
  const response = await fetch(
    `${GRAPH_API_BASE}/me/drive/items/${folderId}/children?$select=id,name,file,size,lastModifiedDateTime&$top=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error(`OneDrive list failed: ${response.statusText}`);
  }

  const data = await response.json();
  return (data.value || [])
    .filter((item: Record<string, unknown>) => item.file) // Only files, not subfolders
    .map((item: Record<string, unknown>) => ({
      id: item.id as string,
      name: item.name as string,
      mimeType: (item.file as Record<string, string>)?.mimeType || "application/octet-stream",
      size: (item.size as number) || 0,
      modifiedTime: item.lastModifiedDateTime as string,
    }));
}

export async function listFolders(
  accessToken: string,
  parentId: string = "root"
): Promise<OneDriveFile[]> {
  const url =
    parentId === "root"
      ? `${GRAPH_API_BASE}/me/drive/root/children?$select=id,name,folder,lastModifiedDateTime&$top=100`
      : `${GRAPH_API_BASE}/me/drive/items/${parentId}/children?$select=id,name,folder,lastModifiedDateTime&$top=100`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`OneDrive list folders failed: ${response.statusText}`);
  }

  const data = await response.json();
  return (data.value || [])
    .filter((item: Record<string, unknown>) => item.folder)
    .map((item: Record<string, unknown>) => ({
      id: item.id as string,
      name: item.name as string,
      mimeType: "folder",
      size: 0,
      modifiedTime: item.lastModifiedDateTime as string,
    }));
}

/**
 * Recursively list all files in a folder and its subfolders.
 */
export async function listFolderFilesRecursive(
  accessToken: string,
  folderId: string,
  maxDepth: number = 3
): Promise<OneDriveFile[]> {
  const allFiles: OneDriveFile[] = [];

  async function recurse(currentFolderId: string, depth: number) {
    if (depth > maxDepth) return;

    const response = await fetch(
      `${GRAPH_API_BASE}/me/drive/items/${currentFolderId}/children?$select=id,name,file,folder,size,lastModifiedDateTime&$top=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      throw new Error(`OneDrive list failed: ${response.statusText}`);
    }

    const data = await response.json();
    const items = data.value || [];

    for (const item of items) {
      if (item.file) {
        allFiles.push({
          id: item.id,
          name: item.name,
          mimeType: item.file?.mimeType || "application/octet-stream",
          size: item.size || 0,
          modifiedTime: item.lastModifiedDateTime,
        });
      } else if (item.folder) {
        await recurse(item.id, depth + 1);
      }
    }
  }

  await recurse(folderId, 0);
  return allFiles;
}

export async function downloadFile(
  accessToken: string,
  fileId: string
): Promise<Buffer> {
  const response = await fetch(
    `${GRAPH_API_BASE}/me/drive/items/${fileId}/content`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error(`OneDrive download failed: ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function getOneDriveUserEmail(
  accessToken: string
): Promise<string | null> {
  const response = await fetch(`${GRAPH_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.mail || data.userPrincipalName || null;
}

/**
 * Resolve a OneDrive/SharePoint sharing URL to a driveItem ID.
 * Uses the Microsoft Graph shares API to decode encoded sharing links.
 */
export async function resolveShareLink(
  accessToken: string,
  shareUrl: string
): Promise<string | null> {
  const encoded = Buffer.from(shareUrl)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await fetch(
    `${GRAPH_API_BASE}/shares/u!${encoded}/driveItem?$select=id`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data.id ?? null;
}
