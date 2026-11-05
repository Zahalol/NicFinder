// Session auth: scrypt password hashing (node:crypto, no external deps),
// opaque session tokens stored hashed in the DB, httpOnly cookies.
// Google OAuth is implemented in /api/auth/google and only enabled when
// GOOGLE_CLIENT_ID/SECRET are configured (honest config state).

import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { prisma } from "./db";
import type { User } from "@prisma/client";

const scrypt = promisify(scryptCb);

export const SESSION_COOKIE = "nf_session";
const SESSION_TTL_DAYS = 30;

// --- Passwords -----------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [scheme, salt, hex] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hex) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hex, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

// --- Sessions --------------------------------------------------------------

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: string,
  meta?: { ip?: string; userAgent?: string }
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86400_000);
  await prisma.authSession.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      ip: meta?.ip?.slice(0, 64),
      userAgent: meta?.userAgent?.slice(0, 256),
    },
  });
  return { token, expiresAt };
}

export async function destroySessionByToken(token: string): Promise<void> {
  await prisma.authSession
    .delete({ where: { tokenHash: hashToken(token) } })
    .catch(() => {});
}

export async function getUserByToken(token: string): Promise<User | null> {
  if (!token) return null;
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.authSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (session.user.status !== "ACTIVE") return null;
  return session.user;
}

/** Current user from the request cookie (server components / route handlers). */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserByToken(token);
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401, "Sign in required");
  return user;
}

export async function requireRole(...roles: string[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new AuthError(403, "Not authorized");
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

export function googleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Replit Auth is trusted only when explicitly enabled — set the
 * REPLIT_AUTH_ENABLED secret ONLY in the Replit deployment, where Replit's
 * proxy injects verified X-Replit-User-* headers. Anywhere else those
 * headers could be forged by the client.
 */
export function replitAuthEnabled(): boolean {
  return process.env.REPLIT_AUTH_ENABLED === "true";
}

/**
 * Stable salted IP hash (never a raw IP) — used to require corroborating
 * price reports to come from distinct networks. Unlike the daily-salted
 * coverage-request hash, this one is stable so sockpuppet corroborations on
 * different days still collide.
 */
export function stableIpHash(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.SESSION_SECRET ?? "dev";
  return createHash("sha256").update(`${ip}|${salt}|corroboration`).digest("hex");
}

// --- Validation ------------------------------------------------------------

export function validatePassword(pw: string): string | null {
  if (pw.length < 10) return "Password must be at least 10 characters.";
  if (pw.length > 200) return "Password is too long.";
  return null;
}

export function validateEmail(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254)
    return "Enter a valid email address.";
  return null;
}
