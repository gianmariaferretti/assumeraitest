import { AuthComponent } from "@/components/auth/auth-component";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in | Assumerai",
  description: "Log in to your Assumerai account.",
};

export default function LoginPage() {
  return <AuthComponent mode="login" />;
}
