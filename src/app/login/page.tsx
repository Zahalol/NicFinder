import { AuthForm } from "@/components/AuthForm";
import { googleOAuthConfigured, replitAuthEnabled } from "@/lib/auth";

export const metadata = { title: "Sign in — NicFinder" };

export default function LoginPage() {
  return <AuthForm mode="login" googleEnabled={googleOAuthConfigured()} replitEnabled={replitAuthEnabled()} />;
}
