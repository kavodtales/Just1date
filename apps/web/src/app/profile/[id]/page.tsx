import { ProfileDetail } from "../../../components/profile-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ProfileDetail id={(await params).id} />;
}
