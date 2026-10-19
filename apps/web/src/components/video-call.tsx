"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  ShieldCheck,
} from "lucide-react";
import type {
  Room,
  LocalVideoTrack,
  RemoteVideoTrack,
  RemoteAudioTrack,
} from "livekit-client";
import type { VideoCall, CallCredentials } from "@just1date/types";
import { api, json } from "../lib/client";
import { QueryState } from "./query-state";
import { useCallUpdates } from "../lib/use-call-updates";

function VideoSurface({
  track,
  label,
  local = false,
}: {
  track?: LocalVideoTrack | RemoteVideoTrack;
  label: string;
  local?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!track || !element) return;
    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [track]);
  return (
    <div className={`call-video-surface ${local ? "self-view" : ""}`}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={local}
        aria-label={label}
        hidden={!track}
      />
      {!track && (
        <div className="call-avatar">
          <VideoOff size={32} />
          <span>{label}</span>
        </div>
      )}
      <span className="call-video-label">{label}</span>
    </div>
  );
}
function CallAudio({ track }: { track?: RemoteAudioTrack }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!track || !element) return;
    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [track]);
  return <audio ref={ref} autoPlay />;
}
const terminal = new Set(["ended", "declined", "cancelled", "missed"]);
export function VideoCallScreen({ id }: { id: string }) {
  useCallUpdates(id);
  const roomRef = useRef<Room | null>(null);
  const [joined, setJoined] = useState(false),
    [busy, setBusy] = useState(false),
    [camera, setCamera] = useState(false),
    [mic, setMic] = useState(false),
    [error, setError] = useState(""),
    [connection, setConnection] = useState("Not connected"),
    [local, setLocal] = useState<LocalVideoTrack>(),
    [remote, setRemote] = useState<RemoteVideoTrack>(),
    [audio, setAudio] = useState<RemoteAudioTrack>();
  const call = useQuery({
    queryKey: ["call", id],
    queryFn: () => api<VideoCall>(`calls/${id}`),
    retry: false,
    refetchInterval: (query) =>
      terminal.has(query.state.data?.status ?? "") || query.state.error
        ? false
        : 15000,
  });
  useEffect(() => {
    if (call.error || (call.data && terminal.has(call.data.status))) {
      void roomRef.current?.disconnect();
      roomRef.current = null;
    }
  }, [call.error, call.data]);
  useEffect(
    () => () => {
      const active = roomRef.current;
      roomRef.current = null;
      if (active) {
        void active.disconnect();
        void api(`calls/${id}/actions`, {
          method: "POST",
          body: json({ action: "end" }),
          keepalive: true,
        }).catch(() => {});
      }
    },
    [id],
  );
  async function action(value: "accept" | "decline" | "end") {
    setBusy(true);
    setError("");
    if (value !== "accept") {
      await roomRef.current?.disconnect();
      roomRef.current = null;
      setJoined(false);
    }
    try {
      await api(`calls/${id}/actions`, {
        method: "POST",
        body: json({ action: value }),
      });
      await call.refetch();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function join() {
    setBusy(true);
    setError("");
    try {
      const { Room, RoomEvent, Track, VideoPresets } =
        await import("livekit-client");
      const access = await api<CallCredentials>(`calls/${id}/token`, {
        method: "POST",
        body: json({}),
      });
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: { resolution: VideoPresets.h360.resolution },
        publishDefaults: { videoCodec: "vp8", simulcast: true },
      });
      roomRef.current = room;
      room.on(RoomEvent.ConnectionStateChanged, (state) =>
        setConnection(
          state === "connected"
            ? "Connected"
            : state === "reconnecting"
              ? "Reconnecting…"
              : state,
        ),
      );
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Video)
          setRemote(track as RemoteVideoTrack);
        if (track.kind === Track.Kind.Audio)
          setAudio(track as RemoteAudioTrack);
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (track.kind === Track.Kind.Video) setRemote(undefined);
        if (track.kind === Track.Kind.Audio) setAudio(undefined);
      });
      room.on(RoomEvent.LocalTrackPublished, (publication) => {
        if (publication.track?.kind === Track.Kind.Video)
          setLocal(publication.track as LocalVideoTrack);
      });
      room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
        if (publication.source === Track.Source.Camera) setLocal(undefined);
      });
      room.on(RoomEvent.Disconnected, () => {
        setJoined(false);
        setCamera(false);
        setMic(false);
        setLocal(undefined);
        setRemote(undefined);
        setAudio(undefined);
        setConnection("Disconnected");
      });
      await room.connect(access.server_url, access.token);
      try {
        await room.startAudio();
      } catch {
        setError("Tap Enable audio to hear your match.");
      }
      setJoined(true);
    } catch {
      await roomRef.current?.disconnect();
      roomRef.current = null;
      setError(
        "We couldn’t connect the call. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function toggle(kind: "camera" | "microphone") {
    if (!roomRef.current) return;
    setBusy(true);
    setError("");
    try {
      if (kind === "camera") {
        await roomRef.current.localParticipant.setCameraEnabled(!camera);
        setCamera(!camera);
      } else {
        await roomRef.current.localParticipant.setMicrophoneEnabled(!mic);
        setMic(!mic);
      }
    } catch {
      setError(
        `Allow ${kind} access in your browser to turn it on. You can continue with it off.`,
      );
    } finally {
      setBusy(false);
    }
  }
  const data = call.data,
    ended = data && terminal.has(data.status);
  return (
    <main className="video-date">
      <header className="video-date-header">
        <Link href={data ? `/messages/${data.conversation_id}` : "/messages"}>
          ← Back to conversation
        </Link>
        <span>
          <ShieldCheck size={17} /> JUST1DATE VIDEO DATE
        </span>
      </header>
      <QueryState
        pending={call.isPending}
        error={call.error}
        retry={call.refetch}
      />
      {data && !call.error && (
        <>
          <div className="video-date-title">
            <p>A LITTLE CLOSER</p>
            <h1>
              {ended ? "Until next time." : `A moment with ${data.other_name}.`}
            </h1>
            <p aria-live="polite">
              {ended
                ? data.status === "missed"
                  ? "This invitation expired."
                  : data.status === "declined"
                    ? "Your invitation was declined."
                    : "This call has ended."
                : joined
                  ? connection
                  : data.status === "ringing"
                    ? data.is_caller
                      ? "Your invitation is on its way. Waiting for them to accept…"
                      : "You’ve been invited to a video date."
                    : "You’re both ready. Join when you feel comfortable."}
            </p>
          </div>
          {!ended && (
            <>
              <div className="video-date-stage">
                <VideoSurface track={remote} label={data.other_name} />
                <VideoSurface track={local} label="You" local />
                <CallAudio track={audio} />
              </div>
              <div className="video-date-controls">
                {data.status === "ringing" && !data.is_caller && (
                  <>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() => action("accept")}
                    >
                      Accept invitation
                    </button>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => action("decline")}
                    >
                      Decline
                    </button>
                  </>
                )}
                {data.status === "accepted" && !joined && (
                  <button className="button" disabled={busy} onClick={join}>
                    {busy ? "Connecting…" : "Join video call"}
                  </button>
                )}
                {joined && (
                  <>
                    <button
                      aria-label={camera ? "Turn camera off" : "Turn camera on"}
                      aria-pressed={camera}
                      disabled={busy}
                      onClick={() => toggle("camera")}
                    >
                      {camera ? <Video /> : <VideoOff />}
                    </button>
                    <button
                      aria-label={
                        mic ? "Mute microphone" : "Turn microphone on"
                      }
                      aria-pressed={mic}
                      disabled={busy}
                      onClick={() => toggle("microphone")}
                    >
                      {mic ? <Mic /> : <MicOff />}
                    </button>
                    <button
                      aria-label="Enable call audio"
                      disabled={busy}
                      onClick={() =>
                        roomRef.current
                          ?.startAudio()
                          .catch(() =>
                            setError(
                              "Your browser could not enable audio. Check its permissions.",
                            ),
                          )
                      }
                    >
                      Enable audio
                    </button>
                  </>
                )}
                <button
                  className="call-hangup"
                  aria-label={
                    data.status === "ringing"
                      ? "Cancel invitation"
                      : "End video call"
                  }
                  disabled={busy}
                  onClick={() => action("end")}
                >
                  <PhoneOff />
                </button>
              </div>
              <p className="call-privacy">
                Your camera and microphone stay off until you turn them on.
                Calls end after 30 minutes. Just1date does not record calls;
                another participant may record their screen.
              </p>
            </>
          )}
          {ended && (
            <Link className="button" href={`/messages/${data.conversation_id}`}>
              Continue chatting
            </Link>
          )}
          <Link
            className="call-report"
            href={`/report?target=${data.other_user_id}`}
          >
            Report a concern
          </Link>
        </>
      )}
      {error && (
        <p role="alert" className="call-error">
          {error}
        </p>
      )}
    </main>
  );
}
