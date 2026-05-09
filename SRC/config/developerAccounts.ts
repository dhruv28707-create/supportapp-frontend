export const DEVELOPER_ACCOUNT_EMAILS = [
  "piyush28707@gmail.com",
  "prachibhatt1972007@gmail.com",
];

export const DEVELOPER_TIER = "developer";
export const DEVELOPER_DAILY_LIMIT = 999999;

export const normalizeEmail = (email?: string | null) =>
  (email ?? "").trim().toLowerCase();

export const isDeveloperEmail = (email?: string | null) =>
  DEVELOPER_ACCOUNT_EMAILS.map(normalizeEmail).includes(normalizeEmail(email));
