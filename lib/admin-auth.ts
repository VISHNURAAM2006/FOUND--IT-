import crypto from "crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "foundit_admin_session";
const SECRET_KEY = process.env.NEXTAUTH_SECRET || "foundit_admin_secret_key_2026";

export function getExpectedAdminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "foundit@admin2026",
  };
}

export function createAdminToken(username: string): string {
  const payload = {
    username,
    role: "admin",
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payloadStr)
    .digest("hex");
  return `${payloadStr}.${signature}`;
}

export function verifyAdminToken(token?: string | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payloadStr, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payloadStr)
    .digest("hex");

  if (signature !== expectedSig) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadStr, "base64").toString("utf-8"));
    if (payload.role !== "admin") return false;
    if (Date.now() > payload.expiresAt) return false;
    return true;
  } catch {
    return false;
  }
}

export async function isAuthenticatedAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminToken(token);
}

export { ADMIN_COOKIE_NAME };
