import { useEffect, useRef, useState } from "react";
import { Text, TextInput, View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import type { Message } from "@just1date/types";
import { auth } from "../../lib/auth";
import { api } from "../../lib/api";
import { Screen, Status, Button, colors, s } from "../../components/ui";
import { StartNativeCall } from "../../components/call-invitation";
export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    qc = useQueryClient();
  const [text, setText] = useState(""),
    [older, setOlder] = useState<Message[]>([]),
    [error, setError] = useState(""),
    [ownId, setOwnId] = useState("");
  const operation = useRef<{ body: string; id: string } | null>(null);
  const q = useQuery({
    queryKey: ["messages", id],
    queryFn: () => api<Message[]>(`conversations/${id}/messages`),
    refetchInterval: 15000,
  });
  const inbox = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api<any[]>("conversations"),
  });
  const match = inbox.data?.find((row) => row.conversation_id === id);
  useEffect(() => {
    if (q.data)
      api(`conversations/${id}/read`, { method: "POST" })
        .then(() => qc.invalidateQueries({ queryKey: ["conversations"] }))
        .catch(() => {});
  }, [q.data, id, qc]);
  useEffect(() => {
    let channel: any;
    let cancelled = false;
    auth?.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled || !data.session || !auth) return;
        setOwnId(data.session.user.id);
        await auth.realtime.setAuth(data.session.access_token);
        if (cancelled) return;
        channel = auth
          .channel(`mobile-chat:${id}`, {
            config: { postgres_changes_options: { wait: true } },
          })
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "messages",
              filter: `conversation_id=eq.${id}`,
            },
            () => qc.invalidateQueries({ queryKey: ["messages", id] }),
          )
          .subscribe();
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Live updates are reconnecting. You can still refresh your messages.",
          );
      });
    return () => {
      cancelled = true;
      if (channel) auth?.removeChannel(channel);
    };
  }, [id, qc]);
  const send = useMutation({
    mutationFn: () => {
      if (operation.current?.body !== text)
        operation.current = { body: text, id: Crypto.randomUUID() };
      return api(`conversations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: text, client_id: operation.current.id }),
      });
    },
    onSuccess: () => {
      operation.current = null;
      setText("");
      qc.invalidateQueries({ queryKey: ["messages", id] });
    },
  });
  const messages = [
    ...new Map([...(q.data ?? []), ...older].map((m) => [m.id, m])).values(),
  ].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return (
    <Screen
      title={match?.profile.display_name ?? "Messages"}
      headerAction={<StartNativeCall conversationId={id} />}
    >
      {match && (
        <Pressable
          accessibilityRole="button"
          style={[s.card, { backgroundColor: colors.soft }]}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/dates",
              params: { match: match.id },
            })
          }
        >
          <Text style={{ fontFamily: "PoppinsSemiBold", color: colors.pink }}>
            Just One Date · Make a little plan ↗
          </Text>
          <Text style={s.muted}>
            Coffee, a gallery or a table for two. Both people choose.
          </Text>
        </Pressable>
      )}
      <Status
        pending={q.isPending}
        error={q.error}
        empty={
          q.data?.length === 0
            ? "A thoughtful hello goes a long way."
            : undefined
        }
        retry={() => q.refetch()}
      />
      {messages.length >= 30 && (
        <Button
          onPress={async () => {
            try {
              const m = messages[0];
              const page = await api<Message[]>(
                `conversations/${id}/messages?before=${encodeURIComponent(m.created_at)}&before_id=${m.id}`,
              );
              setOlder((x) => [...x, ...page]);
              if (!page.length) setError("You have reached the beginning.");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Load earlier messages
        </Button>
      )}
      {messages.map((m) => (
        <View
          key={m.id}
          style={[
            s.card,
            {
              alignSelf: m.sender_id === ownId ? "flex-end" : "flex-start",
              maxWidth: "90%",
              padding: 15,
              backgroundColor:
                m.sender_id === ownId ? colors.purple : colors.soft,
              borderWidth: 0,
              borderBottomLeftRadius: m.sender_id === ownId ? 15 : 0,
              borderBottomRightRadius: m.sender_id === ownId ? 0 : 15,
            },
          ]}
        >
          <Text
            style={{
              fontFamily: "Poppins",
              fontSize: 14,
              color: m.sender_id === ownId ? "white" : colors.ink,
            }}
          >
            {m.deleted_at ? "Message removed" : m.body}
          </Text>
          <Text
            style={[
              s.muted,
              {
                fontSize: 11,
                color: m.sender_id === ownId ? "#e5ccde" : colors.muted,
              },
            ]}
          >
            {new Date(m.created_at).toLocaleTimeString()}
          </Text>
          {m.sender_id === ownId && !m.deleted_at && (
            <Pressable
              accessibilityLabel="Delete your message"
              onPress={async () => {
                try {
                  await api(`messages/${m.id}`, { method: "DELETE" });
                  qc.invalidateQueries({ queryKey: ["messages", id] });
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <Text style={s.muted}>Delete</Text>
            </Pressable>
          )}
        </View>
      ))}
      <TextInput
        multiline
        accessibilityLabel="Your message"
        value={text}
        onChangeText={setText}
        maxLength={2000}
        placeholder="Your message"
        style={s.input}
      />
      {!text && (
        <View style={{ gap: 8 }}>
          {[
            "What would your perfect Sunday look like?",
            "What is one place you would love to explore?",
          ].map((starter) => (
            <Pressable
              key={starter}
              accessibilityRole="button"
              onPress={() => setText(starter)}
              style={[s.card, { padding: 12 }]}
            >
              <Text
                style={{
                  fontFamily: "Poppins",
                  color: colors.pink,
                  fontSize: 12,
                }}
              >
                {starter}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <Button
        disabled={!text.trim() || send.isPending}
        onPress={() => send.mutate()}
      >
        {send.isPending ? "Sending…" : "Send message"}
      </Button>
      {send.error && <Text style={s.error}>{send.error.message}</Text>}
      {error && <Text style={s.error}>{error}</Text>}
    </Screen>
  );
}
