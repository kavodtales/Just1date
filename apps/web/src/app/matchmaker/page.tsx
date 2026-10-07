import { Utility } from "../../components/utility";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ target?: string }>;
}) {
  return <Utility kind="matchmaker" target={(await searchParams).target} />;
}
