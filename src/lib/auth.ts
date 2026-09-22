import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "sielab_admin_session";

const SECRET_STRING =
  process.env.SESSION_SECRET || "sielab_reach_super_secret_session_key_2026";
const SECRET_KEY = new TextEncoder().encode(SECRET_STRING);

export function verifyAdminPin(inputPin: string): boolean {
  if (!inputPin) return false;
  const configuredPin = (process.env.ADMIN_PIN || "sielab2026").trim();
  return inputPin.trim() === configuredPin;
}

export async function createAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

export async function verifyAdminToken(token?: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ["HS256"],
    });
    return payload.role === "admin";
  } catch {
    return false;
  }
}
