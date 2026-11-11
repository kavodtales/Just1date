import { AuthForm } from "../../../components/auth-form";
import { PhoneAuth } from "../../../components/phone-auth";
import { AuthChoice } from "../../../components/auth-choice";
import { notFound } from "next/navigation";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ mode: string }>;
  searchParams: Promise<{ expired?: string }>;
}) {
  const { mode } = await params;
  if (
    !["signup", "phone", "login", "register", "recovery", "reset"].includes(
      mode,
    )
  )
    notFound();
  const query = await searchParams;
  return mode === "signup" ? (
    <AuthChoice />
  ) : mode === "phone" ? (
    <PhoneAuth />
  ) : (
    <AuthForm
      mode={mode}
      initialNotice={
        mode === "login" && query.expired === "true"
          ? "That confirmation or recovery link is invalid or expired. Sign in or request a new recovery link."
          : ""
      }
    />
  );
}
