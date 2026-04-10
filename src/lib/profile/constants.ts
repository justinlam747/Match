export const REMOTE_PREFERENCES = [
  "remote-only",
  "hybrid",
  "onsite",
  "flexible",
] as const;

export type RemotePreference = (typeof REMOTE_PREFERENCES)[number];

export const COMPENSATION_CURRENCIES = ["USD", "EUR", "GBP", "CAD"] as const;
export type CompensationCurrency = (typeof COMPENSATION_CURRENCIES)[number];

export function isRemotePreference(v: unknown): v is RemotePreference {
  return typeof v === "string" && (REMOTE_PREFERENCES as readonly string[]).includes(v);
}
