import { Shell } from "../../components/shell";
import { DatePlanner } from "../../components/date-planner";
export default async function DatesPage({
  searchParams,
}: {
  searchParams: Promise<{ match?: string }>;
}) {
  const { match } = await searchParams;
  return (
    <Shell title="Just One Date" subtitle="A little intention. A real plan.">
      <DatePlanner initialMatch={match} />
    </Shell>
  );
}
