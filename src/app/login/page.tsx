import { AuthForm } from "@/components/AuthForm";
import { googleOAuthConfigured, replitAuthEnabled } from "@/lib/auth";

export const metadata = { title: "Sign in — NicFinder" };

// Human-readable messages for the ?error= codes our OAuth callbacks emit.
// Codes map to fixed strings here — never echo raw query text to the page.
const OAUTH_ERRORS: Record<string, string> = {
  "oauth-state": "Sign-in session expired — please try again.",
  "google-failed": "Google sign-in failed — please try again.",
  "google-not-configured": "Google sign-in is not configured.",
  suspended: "This account is suspended.",
  "email-exists-use-password":
    "An account with this email already exists. Sign in with your password instead.",
  "replit-not-configured": "Replit sign-in is not available here.",
  "replit-not-signed-in": "Replit did not report a signed-in user.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthForm
      mode="login"
      googleEnabled={googleOAuthConfigured()}
      replitEnabled={replitAuthEnabled()}
      initialError={error ? (OAUTH_ERRORS[error] ?? "Sign-in failed — please try again.") : null}
    />
  );
}
