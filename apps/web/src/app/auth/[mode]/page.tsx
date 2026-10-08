import { AuthForm } from "../../../components/auth-form";
import { PhoneAuth } from "../../../components/phone-auth";
export default async function Page({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  return mode === "signup" ? (
    <AuthForm mode="register" />
  ) : mode === "phone" ? (
    <PhoneAuth />
  ) : (
    <AuthForm mode={mode} />
  );
}
