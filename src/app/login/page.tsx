import { AuthForm } from "@/components/AuthForm";
import { googleOAuthConfigured } from "@/lib/auth";

export const metadata = { title: "Sign in — NicFinder" };

export default function LoginPage() {
  return <AuthForm mode="login" googleEnabled={googleOAuthConfigured()} />;
}
