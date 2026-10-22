"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { appImageSlots, type AppImage } from "@just1date/config";
/** Promotional media only: never uses or exposes private member photos. */
export function ManagedPhoto({
  slot,
  hero = false,
  className,
  loading,
}: {
  slot: string;
  hero?: boolean;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const config = appImageSlots.find((s) => s.slot === slot)!;
  const [failed, setFailed] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["app-media"],
    queryFn: async () => {
      const r = await fetch("/api/app-media", { cache: "no-store" });
      if (!r.ok) throw new Error("Images unavailable");
      return (await r.json()).data as AppImage[];
    },
    staleTime: 60000,
    refetchInterval: 60000,
    retry: 1,
  });
  const row = q.data?.find((r) => r.slot === slot),
    custom = row?.url && row.url !== failed;
  const image = (
    <img
      className={className}
      src={custom ? row.url! : config.fallback}
      alt={custom ? row.alt_text : config.alt}
      loading={loading}
      fetchPriority={hero ? "high" : "auto"}
      onError={() => setFailed(row?.url ?? null)}
    />
  );
  return hero ? (
    <picture>
      {!custom && (
        <source
          media="(max-width:700px)"
          srcSet="/images/editorial/hero-mobile.webp"
        />
      )}
      {image}
    </picture>
  ) : (
    image
  );
}
