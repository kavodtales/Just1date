import { Report } from "../../components/report";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ target?: string; message?: string }>;
}) {
  const p = await searchParams;
  return <Report target={p.target} messageId={p.message} />;
}
