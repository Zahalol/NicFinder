import { NextResponse } from "next/server";
import { requireRole, AuthError } from "./auth";
import type { User } from "@prisma/client";

/** Wrap an admin route handler with staff authorization + error mapping. */
export async function withStaff<T>(
  fn: (user: User) => Promise<T>
): Promise<T | NextResponse> {
  try {
    const user = await requireRole("ADMIN", "MODERATOR");
    return await fn(user);
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error." },
      { status: 500 }
    );
  }
}

export async function withAdmin<T>(
  fn: (user: User) => Promise<T>
): Promise<T | NextResponse> {
  try {
    const user = await requireRole("ADMIN");
    return await fn(user);
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error." },
      { status: 500 }
    );
  }
}
