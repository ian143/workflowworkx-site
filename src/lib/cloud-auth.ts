import { db } from "./db";
import { refreshGoogleToken } from "./google-drive";
import { refreshOneDriveToken } from "./onedrive";
import type { CloudProvider } from "@prisma/client";

/**
 * Get a valid (non-expired) access token for a user's cloud connection.
 * Automatically refreshes if the token has expired or is about to expire.
 */
export async function getValidAccessToken(
  userId: string,
  provider: CloudProvider
): Promise<string> {
  const connection = await db.cloudConnection.findUnique({
    where: { userId_provider: { userId, provider } },
  });

  if (!connection) {
    throw new Error(
      `No ${provider} connection found. Please connect in Settings.`
    );
  }

  // If token is still valid (with 5-minute buffer), return it
  const bufferMs = 5 * 60 * 1000;
  if (connection.tokenExpiry.getTime() > Date.now() + bufferMs) {
    return connection.accessToken;
  }

  // Refresh the token
  if (provider === "google_drive") {
    const refreshed = await refreshGoogleToken(connection.refreshToken);
    await db.cloudConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: refreshed.accessToken,
        tokenExpiry: new Date(Date.now() + refreshed.expiresIn * 1000),
      },
    });
    return refreshed.accessToken;
  }

  if (provider === "onedrive") {
    const refreshed = await refreshOneDriveToken(connection.refreshToken);
    await db.cloudConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        tokenExpiry: new Date(Date.now() + refreshed.expiresIn * 1000),
      },
    });
    return refreshed.accessToken;
  }

  throw new Error(`Unsupported cloud provider: ${provider}`);
}
