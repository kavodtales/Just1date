import { redirect } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  redirect(`/messages/${encodeURIComponent((await params).id)}`);
}
