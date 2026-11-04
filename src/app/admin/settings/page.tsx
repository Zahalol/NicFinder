import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
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
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-stone-900">Verification & trust settings</h1>
      <p className="text-sm text-stone-500 mt-1">
        All community-trust thresholds in one place (see docs/COMMUNITY_REPUTATION.md
        for the full rules). {!isAdmin && "Moderators can view; only admins can change."}
      </p>
      <SettingsForm settings={settings} docs={FIELD_DOCS} readOnly={!isAdmin} />
    </div>
  );
}
