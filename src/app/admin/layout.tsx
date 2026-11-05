import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  // Server-side authorization: non-staff never see admin pages. Every admin
  // API route re-checks independently (defense in depth).
  if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
    redirect("/login");
  }

  const pendingReview = await prisma.contribution.count({
    where: { status: { in: ["PENDING", "CORROBORATING"] } },
  });

  const tabs = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/imports", label: "Imports" },
    { href: "/admin/stores", label: "Stores" },
    { href: "/admin/collect", label: "Collect" },
    {
      href: "/admin/review",
      label: pendingReview > 0 ? `Review queue (${pendingReview})` : "Review queue",
    },
    { href: "/admin/coverage", label: "Coverage demand" },
    { href: "/admin/analytics", label: "Analytics" },
    { href: "/admin/economics", label: "Economics" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <div
      className="my-6 rounded-2xl bg-stone-50 text-stone-900 p-4 sm:p-6 ring-1 ring-stone-200"
      style={{ colorScheme: "light" }}
    >
      <div className="flex items-center gap-1 border-b border-stone-200 dark:border-stone-700 pb-2 overflow-x-auto">
        <span className="text-xs uppercase tracking-wide text-stone-400 mr-2">Admin</span>
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-lg px-3 py-1.5 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 whitespace-nowrap"
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}
