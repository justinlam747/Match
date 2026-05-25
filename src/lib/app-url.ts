const LOCAL_APP_URL = "http://localhost:3000";

export function getAppUrl(requestUrl?: string | URL): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.RENDER_EXTERNAL_URL;
  if (configured) return configured;
  if (requestUrl) return new URL(requestUrl).origin;
  return LOCAL_APP_URL;
}
