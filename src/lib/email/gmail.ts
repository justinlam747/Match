import { google } from "googleapis";
import { db } from "@/lib/db";
import { emailConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "@/lib/crypto";
import { getAppUrl } from "@/lib/app-url";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${getAppUrl()}/api/gmail/callback`
  );
}

export function getGmailAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  // Get user's email address
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  return {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token!,
    expiresAt: new Date(tokens.expiry_date!),
    emailAddress: data.email!,
  };
}

export async function getGmailConnection(userId: string) {
  const [connection] = await db
    .select()
    .from(emailConnections)
    .where(
      and(
        eq(emailConnections.userId, userId),
        eq(emailConnections.provider, "gmail")
      )
    )
    .limit(1);

  return connection ?? null;
}

async function getAuthedClient(userId: string) {
  const connection = await getGmailConnection(userId);
  if (!connection) return null;

  const accessToken = decrypt(connection.accessTokenEnc, connection.accessTokenIv, connection.accessTokenTag);
  const refreshToken = decrypt(connection.refreshTokenEnc, connection.refreshTokenIv, connection.refreshTokenTag);

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: connection.tokenExpiresAt.getTime(),
  });

  // Auto-refresh if expired
  if (connection.tokenExpiresAt <= new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    const newAccessEnc = encrypt(credentials.access_token!);
    await db
      .update(emailConnections)
      .set({
        accessTokenEnc: newAccessEnc.encrypted,
        accessTokenIv: newAccessEnc.iv,
        accessTokenTag: newAccessEnc.authTag,
        tokenExpiresAt: new Date(credentials.expiry_date!),
      })
      .where(eq(emailConnections.id, connection.id));
  }

  return oauth2Client;
}

interface GmailSendParams {
  userId: string;
  to: string;
  subject: string;
  body: string;
  fromEmail: string;
  fromName?: string;
}

export async function sendViaGmail({
  userId,
  to,
  subject,
  body,
  fromEmail,
  fromName,
}: GmailSendParams) {
  const auth = await getAuthedClient(userId);
  if (!auth) throw new Error("Gmail not connected");

  const gmail = google.gmail({ version: "v1", auth });

  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

  // Build RFC 2822 message
  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    "",
    body,
  ];
  const rawMessage = messageParts.join("\r\n");

  // Base64url encode
  const encoded = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded },
  });

  return result.data;
}
