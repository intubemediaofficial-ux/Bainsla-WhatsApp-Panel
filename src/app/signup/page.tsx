import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign up" };

export default async function Signup() {
  const b = await getSetting("branding");
  return <Suspense><AuthForm mode="signup" brand={{ name: b.appName, tagline: b.tagline }} /></Suspense>;
}
