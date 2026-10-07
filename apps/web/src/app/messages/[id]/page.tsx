import { Chat } from "../../../components/chat";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Chat id={(await params).id} />;
}
