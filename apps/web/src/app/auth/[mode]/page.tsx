import { AuthForm } from "../../../components/auth-form";
import { AuthChoice } from "../../../components/auth-choice";
import { PhoneAuth } from "../../../components/phone-auth";
export default async function Page({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  return mode === "signup" ? (
    <AuthChoice />
  ) : mode === "phone" ? (
    <PhoneAuth />
  ) : (
    <AuthForm mode={mode} />
  );
}
