import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

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

  const tabs = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/imports", label: "Imports" },
    { href: "/admin/stores", label: "Stores" },
    { href: "/admin/review", label: "Review queue" },
    { href: "/admin/coverage", label: "Coverage demand" },
    { href: "/admin/analytics", label: "Analytics" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <div
      className="my-6 rounded-2xl bg-stone-50 text-stone-900 p-4 sm:p-6 ring-1 ring-stone-200"
      style={{ colorScheme: "light" }}
    >
      <div className="flex items-center gap-1 border-b border-stone-200 pb-2 overflow-x-auto">
        <span className="text-xs uppercase tracking-wide text-stone-400 mr-2">Admin</span>
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 whitespace-nowrap"
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}
