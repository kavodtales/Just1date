import { PhotoStory } from "../../../components/photo-story";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <PhotoStory id={(await params).id} />;
}
