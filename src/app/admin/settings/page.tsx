import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings — NicFinder admin" };

const FIELD_DOCS: Record<string, string> = {
  staleAfterDays: "Days before a price is labeled “may be outdated”.",
  expireAfterDays: "Days before an observation stops counting as the latest price at all.",
  trustedReputation: "Reputation needed for in-range replacement prices to publish instantly.",
  corroborationsRequired: "Independent matching reports needed to publish a non-trusted replacement.",
  maxTrustedPriceChangeRatio: "Max relative change (0.5 = ±50%) trusted users may auto-publish; bigger goes to review.",
  priceSanityMinCents: "Hard minimum believable single-can price (cents).",
  priceSanityMaxCents: "Hard maximum believable single-can price (cents).",
  contributionRateLimitPerHour: "Max contributions per user per hour.",
  commentRateLimitPerHour: "Max comments per user per hour.",
  reconfirmCooldownDays: "Days before the same user can confirm the same store/product again.",
  confirmationHalfLifeDays: "Half-life for confirmation weight decay.",
  autoHideReportCount: "Reports that auto-hide a comment pending review.",
};

export default async function SettingsPage() {
  const [settings, user, auditEvents] = await Promise.all([
    getSettings(),
    getCurrentUser(),
    prisma.auditEvent.findMany({
      include: { user: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Verification & trust settings</h1>
      <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
        All community-trust thresholds in one place (see docs/COMMUNITY_REPUTATION.md
        for the full rules). {!isAdmin && "Moderators can view; only admins can change."}
      </p>
      <SettingsForm settings={settings} docs={FIELD_DOCS} readOnly={!isAdmin} />

      <section className="mt-10">
        <h2 className="font-medium text-stone-900 dark:text-stone-100">Audit log (latest 50)</h2>
        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
          System-recorded events: imports, publications, invalidations, merges,
          settings changes. Append-only.
        </p>
        {auditEvents.length === 0 ? (
          <p className="mt-3 text-sm text-stone-400">No audit events yet.</p>
        ) : (
          <table className="mt-3 w-full text-xs">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-700 text-left text-stone-500 dark:text-stone-400">
                <th className="py-1.5 pr-2">When</th>
                <th className="py-1.5 pr-2">Action</th>
                <th className="py-1.5 pr-2">By</th>
                <th className="py-1.5">Detail</th>
              </tr>
            </thead>
            <tbody>
              {auditEvents.map((e) => (
                <tr key={e.id} className="border-b border-stone-100 dark:border-stone-800 align-top text-stone-600 dark:text-stone-400">
                  <td className="py-1.5 pr-2 whitespace-nowrap">
                    {e.createdAt.toLocaleString()}
                  </td>
                  <td className="py-1.5 pr-2 font-medium text-stone-800 dark:text-stone-200">
                    {e.action.toLowerCase().replace(/_/g, " ")}
                  </td>
                  <td className="py-1.5 pr-2">{e.user?.displayName ?? "system"}</td>
                  <td className="py-1.5 break-all text-stone-500 dark:text-stone-400">
                    {e.targetType && `${e.targetType} `}
                    {e.detailJson !== "{}" && e.detailJson.slice(0, 120)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
