import { AuthForm } from "../../../../../web/src/components/auth-form";
export default async function Page({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  return <AuthForm mode={(await params).mode} />;
}
