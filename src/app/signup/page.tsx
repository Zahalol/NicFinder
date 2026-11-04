import { AuthForm } from "@/components/AuthForm";
import { googleOAuthConfigured } from "@/lib/auth";

export const metadata = { title: "Sign up — NicFinder" };

export default function SignupPage() {
  return <AuthForm mode="signup" googleEnabled={googleOAuthConfigured()} />;
}
