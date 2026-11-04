import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { AgeGateOverlay } from "@/components/AgeGateOverlay";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: "NicFinder — nicotine pouch price comparison",
    template: "%s — NicFinder",
  },
  description:
    "Compare reported ZYN nicotine pouch prices at gas stations and convenience stores near you. Community-verified. Informational service for adults 21+ — we do not sell nicotine products.",
  openGraph: {
    siteName: "NicFinder",
    type: "website",
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    title: "NicFinder",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0d9488" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser().catch(() => null);
  const demoMode = process.env.DEMO_MODE !== "false";
  const cookieStore = await cookies();
  const ageConfirmed = cookieStore.get("nf_age")?.value === "21plus";

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {!ageConfirmed && <AgeGateOverlay />}
        {demoMode && (
          <div className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 text-center text-xs px-3 py-1.5 border-b border-amber-200 dark:border-amber-900">
            Demonstration data — prices shown on fictional “Demo” stores are
            synthetic. Real stores listed have no verified current prices yet.
          </div>
        )}
        <header className="border-b border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-stone-950/90 backdrop-blur sticky top-0 z-40">
          <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-3">
            <Link href="/" className="font-semibold tracking-tight text-lg text-stone-900 dark:text-stone-100">
              Nic<span className="text-teal-600 dark:text-teal-400">Finder</span>
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              {user ? (
                <>
                  {(user.role === "ADMIN" || user.role === "MODERATOR") && (
                    <Link href="/admin" className="text-stone-500 hover:text-stone-900 dark:hover:text-stone-200">
                      Admin
                    </Link>
                  )}
                  <Link href="/account" className="text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100">
                    {user.displayName}
                  </Link>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100">
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 px-3 py-1.5 hover:bg-stone-700 dark:hover:bg-white"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-4 pb-16">{children}</main>
        <footer className="border-t border-stone-200 dark:border-stone-800 mt-8">
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
