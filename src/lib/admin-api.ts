import { NextResponse } from "next/server";
import { requireRole, AuthError } from "./auth";
import type { User } from "@prisma/client";

// Errors thrown by handlers are logged server-side but NEVER echoed to the
// client: unexpected messages (Prisma, fs, etc.) can leak schema/internal
// state. Handlers that want a user-visible message throw ApiError.

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function mapError(e: unknown): NextResponse {
  if (e instanceof AuthError || e instanceof ApiError)
    return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: "Server error." }, { status: 500 });
}

/** Wrap an admin route handler with staff authorization + error mapping. */
export async function withStaff<T>(
  fn: (user: User) => Promise<T>
): Promise<T | NextResponse> {
  try {
    const user = await requireRole("ADMIN", "MODERATOR");
    return await fn(user);
  } catch (e) {
    return mapError(e);
  }
}

export async function withAdmin<T>(
  fn: (user: User) => Promise<T>
): Promise<T | NextResponse> {
  try {
    const user = await requireRole("ADMIN");
    return await fn(user);
  } catch (e) {
    return mapError(e);
  }
}
