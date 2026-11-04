import { AuthForm } from "@/components/AuthForm";
import { googleOAuthConfigured, replitAuthEnabled } from "@/lib/auth";

export const metadata = { title: "Sign up — NicFinder" };

export default function SignupPage() {
  return <AuthForm mode="signup" googleEnabled={googleOAuthConfigured()} replitEnabled={replitAuthEnabled()} />;
}
