import { VideoCallScreen } from "../../../components/video-call";
export default async function CallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VideoCallScreen id={id} />;
}
