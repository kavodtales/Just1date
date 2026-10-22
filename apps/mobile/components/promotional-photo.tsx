import { useState } from "react";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import type { AppImage } from "@just1date/config";
export function PromotionalPhoto({ slot }: { slot: "date_venue" }) {
  const [failed, setFailed] = useState<string | null>(null);
  const media = useQuery({
    queryKey: ["app-media"],
    queryFn: async () => {
      if (!process.env.EXPO_PUBLIC_API_URL) return [] as AppImage[];
      const r = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/v1/app-media`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error("Images unavailable");
      return (await r.json()).data as AppImage[];
    },
    staleTime: 60000,
    refetchInterval: 60000,
    retry: 1,
  });
  const row = media.data?.find((r) => r.slot === slot),
    remote = row?.url && row.url !== failed;
  return (
    <Image
      source={
        remote ? { uri: row.url! } : require("../assets/editorial/venue.webp")
      }
      style={{ height: 205, width: "100%" }}
      contentFit="cover"
      accessibilityLabel={
        remote ? row.alt_text : "AI-created illustrative restaurant courtyard"
      }
      onError={() => setFailed(row?.url ?? null)}
    />
  );
}
