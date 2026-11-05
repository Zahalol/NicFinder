// Page-level authorization for server components.
//
// The /admin layout also checks the role, but a layout is NOT a security
// boundary in the App Router: layouts and pages render in parallel, and a
// layout does not re-execute on client-side navigation between its children.
// Every admin page therefore enforces authorization itself, next to the data
// it fetches (same principle as withStaff/withAdmin on the API routes).

import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import type { User } from "@prisma/client";

export async function requireStaffPage(): Promise<User> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
    redirect("/login");
  }
  return user;
}
