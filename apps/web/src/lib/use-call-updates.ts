"use client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { realtimeClient } from "./realtime";
// One private subscription replaces continuous invitation polling when connected.
export function useCallUpdates(id?: string) {
  const query = useQueryClient(),
    [connected, setConnected] = useState(false);
  useEffect(() => {
    let cancelled = false,
      close = () => {};
    void realtimeClient()
      .then((session) => {
        if (!session || cancelled) return;
        const channel = session.client
          .channel(id ? `call:${id}` : `call-invites:${session.user_id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: id ? "call_sessions" : "notifications",
              filter: id ? `id=eq.${id}` : `user_id=eq.${session.user_id}`,
            },
            (payload) => {
              if (id || (payload.new as { kind?: string }).kind === "call")
                void query.invalidateQueries({
                  queryKey: id ? ["call", id] : ["incoming-calls"],
                });
            },
          )
          .subscribe((status) => setConnected(status === "SUBSCRIBED"));
        const refresh = setInterval(async () => {
          try {
            const r = await fetch("/api/session", { cache: "no-store" });
            if (r.ok)
              await session.client.realtime.setAuth(
                (await r.json()).access_token,
              );
            else {
              setConnected(false);
              await session.client.removeChannel(channel);
            }
          } catch {
            setConnected(false);
          }
        }, 240000);
        close = () => {
          clearInterval(refresh);
          void session.client.removeChannel(channel);
        };
      })
      .catch(() => {
        if (!cancelled) setConnected(false);
      });
    return () => {
      cancelled = true;
      close();
    };
  }, [id, query]);
  return connected;
}
