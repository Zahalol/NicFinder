import { AuthForm } from "@/components/AuthForm";
import { googleOAuthConfigured, replitAuthEnabled } from "@/lib/auth";

export const metadata = { title: "Sign in — NicFinder" };

// OAuth/redirect error codes → human messages. Previously these were
// silently dropped — a failed Google sign-in just showed a blank form.
const ERROR_MESSAGES: Record<string, string> = {
  "oauth-state": "That sign-in attempt expired — please try again.",
  "google-failed": "Google sign-in failed — please try again.",
  "google-not-configured": "Google sign-in isn’t configured on this server.",
  "email-has-password-account":
    "That Google account’s email already has a password account here — sign in with your password instead.",
  suspended: "This account is suspended.",
  "replit-not-configured": "Replit sign-in isn’t enabled on this server.",
  "replit-not-signed-in": "You’re not signed in at the Replit layer yet.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  // Only KNOWN codes render a banner — a stray/crafted ?error= value must
  // not make a fresh page claim a sign-in failure that never happened.
  const notice = error ? ERROR_MESSAGES[error] : undefined;
  return (
    <AuthForm
      mode="login"
      googleEnabled={googleOAuthConfigured()}
      replitEnabled={replitAuthEnabled()}
      notice={notice}
    />
  );
}
