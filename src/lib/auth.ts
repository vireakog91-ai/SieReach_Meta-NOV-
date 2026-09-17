import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "sielab_session";

// 32+ bytes secret key for HS256 JWT
const AUTH_SECRET_KEY = process.env.AUTH_SECRET || "sielab-reach-closed-auth-super-secret-key-2026";
const SECRET = new TextEncoder().encode(AUTH_SECRET_KEY);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "CLIENT";
  avatarUrl?: string | null;
}

/**
 * Hash plain text password with bcrypt
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/**
 * Verify plain text password against stored hash
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Sign a secure JWT session token (valid for 7 days)
 */
export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl || null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

/**
 * Verify and decode a JWT session token
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload || !payload.sub) return null;

    return {
      id: String(payload.sub),
      email: String(payload.email || ""),
      name: String(payload.name || "User"),
      role: (payload.role as "ADMIN" | "CLIENT") || "CLIENT",
      avatarUrl: payload.avatarUrl ? String(payload.avatarUrl) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Retrieve session user from server request cookies
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Standard cookie configuration for session cookie
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
};
