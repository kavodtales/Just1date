import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { router, usePathname } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import type { VideoCall } from "@just1date/types";
import { api } from "../lib/api";
import { auth } from "../lib/auth";
import { colors, s } from "./ui";
export function StartNativeCall({
  conversationId,
}: {
  conversationId: string;
}) {
  const operation = useRef<string | null>(null);
  const config = useQuery({
    queryKey: ["call-config"],
    queryFn: () => api<{ enabled: boolean }>("calls/config"),
    retry: false,
    staleTime: 60000,
  });
  const start = useMutation({
    mutationFn: () => {
      operation.current ??= Crypto.randomUUID();
      return api<VideoCall>(`conversations/${conversationId}/calls`, {
        method: "POST",
        body: JSON.stringify({ operation_id: operation.current }),
      });
    },
    onSuccess: (call) => {
      operation.current = null;
      router.push(`/calls/${call.id}`);
    },
  });
  return (
    <View>
      <Pressable
        style={[s.square, !config.data?.enabled && { opacity: 0.45 }]}
        accessibilityRole="button"
        accessibilityLabel={
          config.data?.enabled
            ? "Invite to video call"
            : "Video calls temporarily unavailable"
        }
        disabled={!config.data?.enabled || start.isPending}
        onPress={() => start.mutate()}
      >
        <Ionicons name="videocam-outline" size={23} color={colors.pink} />
      </Pressable>
      {start.error && (
        <Text accessibilityLiveRegion="polite" style={s.error}>
          {start.error.message}
        </Text>
      )}
    </View>
  );
}
export function IncomingNativeCall() {
  const client = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null),
    [connected, setConnected] = useState(false);
  const path = usePathname(),
    [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let live = true;
    auth?.auth.getSession().then(({ data }) => {
      if (live) {
        setSignedIn(Boolean(data.session));
        setUserId(data.session?.user.id ?? null);
      }
    });
    const listener = auth?.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      setUserId(session?.user.id ?? null);
    });
    return () => {
      live = false;
      listener?.data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!auth || !userId) return;
    const channel = auth
      .channel(`call-invites:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new.kind === "call")
            void client.invalidateQueries({ queryKey: ["incoming-calls"] });
        },
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));
    return () => {
      void auth?.removeChannel(channel);
    };
  }, [userId, client]);
  const q = useQuery({
    queryKey: ["incoming-calls"],
    queryFn: () => api<VideoCall[]>("calls/incoming"),
    refetchInterval: (query) =>
      query.state.data?.length ? 5000 : connected ? false : 30000,
    retry: false,
    enabled: signedIn && !path.startsWith("/calls/"),
  });
  const call = q.data?.[0];
  if (!call || !signedIn || path.startsWith("/calls/")) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Video invitation from ${call.other_name}. View invitation.`}
      onPress={() => router.push(`/calls/${call.id}`)}
      style={styles.banner}
    >
      <Ionicons name="videocam" size={24} color={colors.pink} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "PoppinsSemiBold", color: colors.ink }}>
          {call.other_name}
        </Text>
        <Text style={s.muted}>Would like to have a video date.</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.pink} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fffefb",
    borderWidth: 1,
    borderColor: "#d5dccf",
    borderRadius: 20,
    elevation: 8,
    shadowColor: "#203028",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    zIndex: 100,
  },
});
