import { AuthComponent } from "@/components/auth/auth-component";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up | Assumerai",
  description: "Create your Assumerai account.",
};

export default function SignupPage() {
  return <AuthComponent mode="signup" />;
}
