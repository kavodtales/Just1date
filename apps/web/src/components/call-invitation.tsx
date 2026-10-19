"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Video, PhoneOff } from "lucide-react";
import type { VideoCall } from "@just1date/types";
import { api, json } from "../lib/client";
import { useCallUpdates } from "../lib/use-call-updates";
export function StartVideoCall({ conversationId }: { conversationId: string }) {
  const router = useRouter(),
    operation = useRef<string | null>(null);
  const config = useQuery({
    queryKey: ["call-config"],
    queryFn: () => api<{ enabled: boolean }>("calls/config"),
    retry: false,
    staleTime: 60000,
  });
  const start = useMutation({
    mutationFn: () => {
      operation.current ??= crypto.randomUUID();
      return api<VideoCall>(`conversations/${conversationId}/calls`, {
        method: "POST",
        body: json({ operation_id: operation.current }),
      });
    },
    onSuccess: (call) => {
      operation.current = null;
      router.push(`/calls/${call.id}`);
    },
  });
  return (
    <div className="call-invite-control">
      <button
        className="square-control"
        aria-label="Start video call"
        title={
          config.data?.enabled
            ? "Invite to a video call"
            : "Video calls are temporarily unavailable"
        }
        disabled={!config.data?.enabled || start.isPending}
        onClick={() => start.mutate()}
      >
        <Video size={21} />
      </button>
      {start.error && <p role="alert">{start.error.message}</p>}
    </div>
  );
}
export function IncomingCall() {
  const connected = useCallUpdates();
  const path = usePathname(),
    [error, setError] = useState("");
  const calls = useQuery({
    queryKey: ["incoming-calls"],
    queryFn: () => api<VideoCall[]>("calls/incoming"),
    refetchInterval: (query) =>
      (query.state.error as { status?: number } | null)?.status === 401
        ? false
        : query.state.data?.length
          ? 5000
          : connected
            ? false
            : 30000,
    retry: false,
    enabled: !path.startsWith("/calls/"),
  });
  const call = calls.data?.[0];
  if (!call || path.startsWith("/calls/")) return null;
  return (
    <aside
      className="incoming-call"
      aria-label="Incoming video invitation"
      role="status"
    >
      <Video aria-hidden="true" />
      <div>
        <strong>{call.other_name}</strong>
        <p>Would like to have a video date.</p>
      </div>
      <Link className="button" href={`/calls/${call.id}`}>
        View invitation
      </Link>
      <button
        aria-label="Decline video invitation"
        onClick={async () => {
          try {
            await api(`calls/${call.id}/actions`, {
              method: "POST",
              body: json({ action: "decline" }),
            });
            await calls.refetch();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <PhoneOff size={20} />
      </button>
      {error && <p role="alert">{error}</p>}
    </aside>
  );
}
