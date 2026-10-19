import { useEffect, useRef, useState } from "react";
import { Text, View, Pressable, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useLocalParticipant,
  useConnectionState,
  useRoomContext,
} from "@livekit/react-native";
import { Track, LocalVideoTrack, type Room } from "livekit-client";
import type { CallCredentials, VideoCall } from "@just1date/types";
import { api } from "../../lib/api";
import { Screen, Status, Button, s } from "../../components/ui";
import { auth } from "../../lib/auth";
const terminal = new Set(["ended", "missed", "declined", "cancelled"]);
function RoomView({
  call,
  hangup,
  roomRef,
}: {
  call: VideoCall;
  hangup(): void;
  roomRef: { current: Room | null };
}) {
  const room = useRoomContext(),
    tracks = useTracks([Track.Source.Camera]),
    local = useLocalParticipant(),
    state = useConnectionState();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [facing, setFacing] = useState<"user" | "environment">("user");
  useEffect(() => {
    roomRef.current = room;
    return () => {
      roomRef.current = null;
    };
  }, [room, roomRef]);
  const remote = tracks.find((track) => !track.participant.isLocal),
    own = tracks.find((track) => track.participant.isLocal);
  async function toggle(kind: "camera" | "microphone") {
    setBusy(true);
    setError("");
    try {
      if (kind === "camera")
        await local.localParticipant.setCameraEnabled(!local.isCameraEnabled);
      else
        await local.localParticipant.setMicrophoneEnabled(
          !local.isMicrophoneEnabled,
        );
    } catch {
      setError(
        `Allow ${kind} access in your device settings to turn it on. You can keep it off.`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.room}>
      <Text accessibilityLiveRegion="polite" style={styles.connection}>
        {state === "connected"
          ? "Connected"
          : state === "reconnecting"
            ? "Reconnecting…"
            : state}
      </Text>
      <View style={styles.remote}>
        {remote ? (
          <VideoTrack
            trackRef={remote}
            style={styles.video}
            objectFit="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="videocam-off-outline" size={44} color="#c7d6c0" />
            <Text style={styles.peerName}>{call.other_name}</Text>
            <Text style={styles.connection}>Camera off</Text>
          </View>
        )}
        {own && (
          <VideoTrack
            trackRef={own}
            style={styles.self}
            mirror
            objectFit="cover"
          />
        )}
      </View>
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            local.isCameraEnabled ? "Turn camera off" : "Turn camera on"
          }
          disabled={busy}
          style={styles.control}
          onPress={() => toggle("camera")}
        >
          <Ionicons
            name={local.isCameraEnabled ? "videocam" : "videocam-off"}
            size={24}
            color="white"
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            local.isMicrophoneEnabled ? "Mute microphone" : "Turn microphone on"
          }
          disabled={busy}
          style={styles.control}
          onPress={() => toggle("microphone")}
        >
          <Ionicons
            name={local.isMicrophoneEnabled ? "mic" : "mic-off"}
            size={24}
            color="white"
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch camera"
          disabled={busy || !local.isCameraEnabled}
          style={styles.control}
          onPress={async () => {
            try {
              const track = local.cameraTrack?.track;
              if (track instanceof LocalVideoTrack) {
                const next = facing === "user" ? "environment" : "user";
                await track.restartTrack({ facingMode: next });
                setFacing(next);
              }
            } catch {
              setError("Your device could not switch cameras.");
            }
          }}
        >
          <Ionicons name="camera-reverse-outline" size={24} color="white" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="End video call"
          style={[styles.control, { backgroundColor: "#a84959" }]}
          onPress={hangup}
        >
          <Ionicons name="call" size={24} color="white" />
        </Pressable>
      </View>
      {error && (
        <Text style={s.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}
export default function CallScreen() {
  const client = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>(),
    roomRef = useRef<Room | null>(null);
  const [access, setAccess] = useState<CallCredentials | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const q = useQuery({
    queryKey: ["call", id],
    queryFn: () => api<VideoCall>(`calls/${id}`),
    retry: false,
    refetchInterval: (query) =>
      terminal.has(query.state.data?.status ?? "") || query.state.error
        ? false
        : 15000,
  });
  const call = q.data,
    ended = call && terminal.has(call.status);
  useEffect(() => {
    if (!auth) return;
    const channel = auth
      .channel(`call:${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_sessions",
          filter: `id=eq.${id}`,
        },
        () => {
          void client.invalidateQueries({ queryKey: ["call", id] });
        },
      )
      .subscribe();
    return () => {
      void auth?.removeChannel(channel);
    };
  }, [id, client]);
  useEffect(() => {
    if (ended || q.error) {
      void roomRef.current?.disconnect();
      setAccess(null);
      void AudioSession.stopAudioSession();
    }
  }, [ended, q.error]);
  useEffect(
    () => () => {
      const room = roomRef.current;
      roomRef.current = null;
      if (room) {
        void room.disconnect();
        void api(`calls/${id}/actions`, {
          method: "POST",
          body: JSON.stringify({ action: "end" }),
        }).catch(() => {});
      }
      void AudioSession.stopAudioSession();
    },
    [id],
  );
  async function action(value: "accept" | "decline" | "end") {
    setBusy(true);
    setError("");
    if (value !== "accept") {
      setAccess(null);
      await roomRef.current?.disconnect();
      await AudioSession.stopAudioSession();
    }
    try {
      await api(`calls/${id}/actions`, {
        method: "POST",
        body: JSON.stringify({ action: value }),
      });
      await q.refetch();
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
      const credentials = await api<CallCredentials>(`calls/${id}/token`, {
        method: "POST",
        body: "{}",
      });
      await AudioSession.startAudioSession();
      setAccess(credentials);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      title="Video date"
      contentStyle={{ paddingBottom: 35 }}
      headerAction={
        <Pressable
          accessibilityLabel="Back to conversation"
          style={s.square}
          onPress={async () => {
            if (call && !ended) await action("end");
            if (call) router.replace(`/messages/${call.conversation_id}`);
            else router.back();
          }}
        >
          <Ionicons name="close" size={24} color="#884757" />
        </Pressable>
      }
    >
      <Status pending={q.isPending} error={q.error} retry={() => q.refetch()} />
      {call && (
        <>
          <Text style={[s.stateTitle, { fontSize: 28 }]}>
            {ended ? "Until next time." : `A moment with ${call.other_name}.`}
          </Text>
          <Text style={s.muted}>
            {ended
              ? call.status === "missed"
                ? "This invitation expired."
                : "This call has ended."
              : call.status === "ringing"
                ? call.is_caller
                  ? "Waiting for them to accept your invitation…"
                  : "You’ve been invited to a video date."
                : "You’re both ready. Join when you feel comfortable."}
          </Text>
          {access && !ended ? (
            <LiveKitRoom
              serverUrl={access.server_url}
              token={access.token}
              connect
              audio={false}
              video={false}
              options={{
                adaptiveStream: { pixelDensity: "screen" },
                dynacast: true,
                videoCaptureDefaults: {
                  resolution: { width: 640, height: 360, frameRate: 24 },
                },
              }}
              onError={() => {
                setError(
                  "The call could not connect. Check your connection and try again.",
                );
                setAccess(null);
                void AudioSession.stopAudioSession();
              }}
              onDisconnected={() => {
                setAccess(null);
                void AudioSession.stopAudioSession();
              }}
            >
              <RoomView
                call={call}
                roomRef={roomRef}
                hangup={() => action("end")}
              />
            </LiveKitRoom>
          ) : (
            <View style={{ gap: 12, marginVertical: 25 }}>
              {call.status === "ringing" && !call.is_caller && (
                <>
                  <Button disabled={busy} onPress={() => action("accept")}>
                    Accept invitation
                  </Button>
                  <Button disabled={busy} onPress={() => action("decline")}>
                    Decline
                  </Button>
                </>
              )}
              {call.status === "accepted" && (
                <Button disabled={busy} onPress={join}>
                  {busy ? "Connecting…" : "Join video call"}
                </Button>
              )}
              {!ended && (
                <Button disabled={busy} onPress={() => action("end")}>
                  {call.status === "ringing" ? "Cancel invitation" : "End call"}
                </Button>
              )}
              {ended && (
                <Button
                  onPress={() =>
                    router.replace(`/messages/${call.conversation_id}`)
                  }
                >
                  Continue chatting
                </Button>
              )}
            </View>
          )}
          <Text style={[s.muted, { fontSize: 12 }]}>
            Camera and microphone stay off until you turn them on. Keep the app
            open during your call. Calls end after 30 minutes. Just1date does
            not record calls; another person may record their screen.
          </Text>
          <Pressable
            style={s.link}
            onPress={async () => {
              if (!ended) await action("end");
              router.push(`/report?target=${call.other_user_id}`);
            }}
          >
            <Text style={s.error}>Report a concern</Text>
          </Pressable>
        </>
      )}
      {error && (
        <Text style={s.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  room: { marginVertical: 20, gap: 15 },
  connection: {
    fontFamily: "Poppins",
    fontSize: 12,
    color: "#aabfa8",
    textAlign: "center",
  },
  remote: {
    height: 360,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#293c30",
  },
  video: { flex: 1 },
  self: {
    position: "absolute",
    bottom: 14,
    right: 14,
    width: 95,
    height: 135,
    borderRadius: 16,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 15,
  },
  peerName: { fontFamily: "PoppinsSemiBold", fontSize: 22, color: "#f8f7f2" },
  controls: { flexDirection: "row", justifyContent: "center", gap: 12 },
  control: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: "#344538",
    justifyContent: "center",
    alignItems: "center",
  },
});
