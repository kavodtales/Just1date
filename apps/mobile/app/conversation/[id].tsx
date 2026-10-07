import { Redirect, useLocalSearchParams } from "expo-router";
export default function Page() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/messages/${id}`} />;
}
