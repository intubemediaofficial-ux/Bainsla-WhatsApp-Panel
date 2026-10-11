import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Login" };

export default async function Login() {
  const b = await getSetting("branding");
  return <Suspense><AuthForm mode="login" brand={{ name: b.appName, tagline: b.tagline }} /></Suspense>;
}
