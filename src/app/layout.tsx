import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

export const metadata: Metadata = {
  title: "NicFinder — nicotine pouch price comparison",
  description:
    "Compare reported nicotine pouch prices at stores near you. Informational service for adults 21+. We do not sell nicotine products.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser().catch(() => null);
  const demoMode = process.env.DEMO_MODE !== "false";

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {demoMode && (
          <div className="bg-amber-100 text-amber-900 text-center text-xs px-3 py-1.5 border-b border-amber-200">
            Demonstration data — prices shown on fictional “Demo” stores are
            synthetic. Real stores listed have no verified current prices yet.
          </div>
        )}
        <header className="border-b border-stone-200 bg-white/90 backdrop-blur sticky top-0 z-40">
          <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-3">
            <Link href="/" className="font-semibold tracking-tight text-lg text-stone-900">
              Nic<span className="text-teal-600">Finder</span>
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              {user ? (
                <>
                  {(user.role === "ADMIN" || user.role === "MODERATOR") && (
                    <Link href="/admin" className="text-stone-500 hover:text-stone-900">
                      Admin
                    </Link>
                  )}
                  <Link href="/account" className="text-stone-600 hover:text-stone-900">
                    {user.displayName}
                  </Link>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="text-stone-600 hover:text-stone-900">
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-lg bg-stone-900 text-white px-3 py-1.5 hover:bg-stone-700"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-16">{children}</main>
        <footer className="border-t border-stone-200 mt-8">
          <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-stone-500 space-y-2">
            <p>
              NicFinder is an informational price-comparison service for adults
              21+. We do not sell, deliver, or promote nicotine products.
              Prices are reported by calls, imports, and community members;
              they vary by store, may exclude tax, and may be out of date.
              Always check with the store.
            </p>
            <p>
              Map data © OpenStreetMap contributors. ZIP locations from
              GeoNames (CC BY 4.0). Underage sale of nicotine products is
              illegal.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
