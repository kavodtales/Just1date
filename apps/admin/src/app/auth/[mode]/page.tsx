import { AuthForm } from "../../../../../web/src/components/auth-form";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  if (!["login", "recovery", "reset"].includes(mode)) notFound();
  return <AuthForm mode={mode} staff />;
}
