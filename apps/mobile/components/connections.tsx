import { useState } from "react";
import { Text, Pressable, View, TextInput, Alert } from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { api } from "../lib/api";
import { Screen, Status, Button, s, colors } from "./ui";
export function Connections({
  likes = false,
  messages = false,
}: {
  likes?: boolean;
  messages?: boolean;
}) {
  const qc = useQueryClient(),
    endpoint = likes ? "likes" : messages ? "conversations" : "matches";
  const [search, setSearch] = useState(""),
    [reverse, setReverse] = useState(false),
    [older, setOlder] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: [endpoint],
    queryFn: () => api<any[]>(endpoint),
    refetchInterval: messages ? 15000 : false,
  });
  const rows = [
    ...new Map(
      [...(q.data ?? []), ...older].map((row) => [
        likes ? row.user_id : row.id,
        row,
      ]),
    ).values(),
  ];
  const visible = rows.filter((row) =>
    (likes ? row.display_name : row.profile.display_name)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  if (reverse) visible.reverse();
  async function action(row: any, pass: boolean) {
    setBusy(true);
    setError("");
    try {
      await api(likes ? (pass ? "passes" : "likes") : `matches/${row.id}`, {
        method: likes ? "POST" : "DELETE",
        ...(likes
          ? {
              body: JSON.stringify({
                target_id: row.user_id,
                operation_id: Crypto.randomUUID(),
              }),
            }
          : {}),
      });
      setOlder((v) => v.filter((r) => r.id !== row.id));
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["likes"] }),
        qc.invalidateQueries({ queryKey: ["matches"] }),
        qc.invalidateQueries({ queryKey: ["conversations"] }),
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      title={likes ? "Likes" : messages ? "Messages" : "Matches"}
      headerAction={
        <Pressable
          style={s.square}
          accessibilityLabel="Reverse connection order"
          onPress={() => setReverse((v) => !v)}
        >
          <Ionicons name="swap-vertical" size={23} color={colors.pink} />
        </Pressable>
      }
    >
      {!messages && (
        <>
          <Text style={[s.muted, { fontSize: 16 }]}>
            This is a list of people who have liked you and your matches.
          </Text>
          <View style={{ flexDirection: "row", gap: 22 }}>
            <Pressable
              style={s.link}
              onPress={() => router.push("/(tabs)/matches")}
            >
              <Text
                style={{
                  color: likes ? "#aaa8b5" : colors.pink,
                  fontFamily: "PoppinsSemiBold",
                }}
              >
                Matches
              </Text>
            </Pressable>
            <Pressable
              style={s.link}
              onPress={() => router.push("/(tabs)/likes")}
            >
              <Text
                style={{
                  color: likes ? colors.pink : "#aaa8b5",
                  fontFamily: "PoppinsSemiBold",
                }}
              >
                Likes you
              </Text>
            </Pressable>
          </View>
        </>
      )}
      {messages && (
        <TextInput
          style={[s.input, { minHeight: 48 }]}
          accessibilityLabel="Search conversations by name"
          placeholder="Search"
          value={search}
          onChangeText={setSearch}
        />
      )}
      <Status
        pending={q.isPending}
        error={q.error}
        empty={
          q.data?.length === 0 ? "Your next connection starts here." : undefined
        }
        retry={() => q.refetch()}
      />
      {messages && rows.length > 0 && (
        <>
          <Text style={{ fontSize: 20, fontFamily: "PoppinsBold" }}>
            Activities
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            {rows.slice(0, 4).map((row) => (
              <Pressable
                accessibilityLabel={`View ${row.profile.display_name}'s profile`}
                key={row.id}
                style={{ width: 60 }}
                onPress={() => router.push(`/profile/${row.profile.user_id}`)}
              >
                {row.profile.photos?.[0] ? (
                  <Image
                    source={{ uri: row.profile.photos[0] }}
                    cachePolicy="memory"
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      borderWidth: 2,
                      borderColor: colors.pink,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: colors.soft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: colors.pink }}>
                      {row.profile.display_name[0]}
                    </Text>
                  </View>
                )}
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 12,
                    fontFamily: "PoppinsBold",
                    marginTop: 5,
                    textAlign: "center",
                  }}
                >
                  {row.profile.display_name}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ fontSize: 20, fontFamily: "PoppinsBold" }}>
            Messages
          </Text>
        </>
      )}
      <View
        style={
          messages
            ? { gap: 0 }
            : { flexDirection: "row", flexWrap: "wrap", gap: 15 }
        }
      >
        {visible.map((row) => {
          const p = likes ? row : row.profile;
          return messages ? (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              accessibilityLabel={`Open conversation with ${p.display_name}`}
              onPress={() => router.push(`/messages/${row.conversation_id}`)}
              style={{ flexDirection: "row", gap: 12, paddingVertical: 9 }}
            >
              {p.photos?.[0] ? (
                <Image
                  source={{ uri: p.photos[0] }}
                  cachePolicy="memory"
                  style={{ height: 54, width: 54, borderRadius: 27 }}
                />
              ) : (
                <View
                  style={{
                    height: 54,
                    width: 54,
                    borderRadius: 27,
                    backgroundColor: colors.soft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text>{p.display_name[0]}</Text>
                </View>
              )}
              <View
                style={{
                  flex: 1,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.line,
                  paddingBottom: 10,
                }}
              >
                <View style={s.row}>
                  <Text style={{ fontFamily: "PoppinsBold", fontSize: 14 }}>
                    {p.display_name}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#aaa8b5" }}>
                    {new Date(
                      row.last_message?.created_at ?? row.created_at,
                    ).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
                <View style={s.row}>
                  <Text
                    numberOfLines={1}
                    style={{ fontFamily: "Poppins", fontSize: 13, flex: 1 }}
                  >
                    {row.last_message
                      ? row.last_message.deleted
                        ? "Message removed"
                        : row.last_message.body
                      : "Say hello to your new match"}
                  </Text>
                  {row.unread_count > 0 && (
                    <Text
                      style={{
                        backgroundColor: colors.pink,
                        color: "white",
                        minWidth: 20,
                        borderRadius: 10,
                        textAlign: "center",
                        fontSize: 12,
                      }}
                    >
                      {row.unread_count > 99 ? "99+" : row.unread_count}
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          ) : (
            <View
              key={likes ? p.user_id : row.id}
              style={{
                width: "47.4%",
                height: 205,
                borderRadius: 15,
                overflow: "hidden",
                backgroundColor: colors.soft,
              }}
            >
              <Pressable
                style={{ flex: 1 }}
                accessibilityLabel={`View ${p.display_name}'s profile`}
                onPress={() => router.push(`/profile/${p.user_id}`)}
              >
                {p.photos?.[0] ? (
                  <Image
                    source={{ uri: p.photos[0] }}
                    cachePolicy="memory"
                    style={{ height: 205, width: "100%" }}
                    contentFit="cover"
                  />
                ) : (
                  <Text
                    style={{
                      fontSize: 45,
                      textAlign: "center",
                      paddingTop: 55,
                      color: colors.pink,
                    }}
                  >
                    {p.display_name[0]}
                  </Text>
                )}
              </Pressable>
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: "#0005",
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    color: "white",
                    fontFamily: "PoppinsSemiBold",
                    fontSize: 14,
                    marginHorizontal: 12,
                    marginBottom: 4,
                  }}
                >
                  {p.display_name}, {p.age}
                </Text>
                <View style={{ flexDirection: "row" }}>
                  <Pressable
                    disabled={busy}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 42,
                      borderTopWidth: 1,
                      borderColor: "#ffffff35",
                    }}
                    accessibilityLabel={
                      likes
                        ? `Pass on ${p.display_name}`
                        : `Unmatch ${p.display_name}`
                    }
                    onPress={() =>
                      likes
                        ? action(row, true)
                        : Alert.alert(
                            "Unmatch?",
                            `This closes your conversation with ${p.display_name}.`,
                            [
                              { text: "Keep match", style: "cancel" },
                              {
                                text: "Unmatch",
                                style: "destructive",
                                onPress: () => action(row, true),
                              },
                            ],
                          )
                    }
                  >
                    <Ionicons name="close" size={23} color="white" />
                  </Pressable>
                  <Pressable
                    disabled={busy}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 42,
                      borderTopWidth: 1,
                      borderLeftWidth: 1,
                      borderColor: "#ffffff35",
                    }}
                    accessibilityLabel={
                      likes
                        ? `Like ${p.display_name} back`
                        : `Message ${p.display_name}`
                    }
                    onPress={() =>
                      likes
                        ? action(row, false)
                        : router.push(`/messages/${row.conversation_id}`)
                    }
                  >
                    <Ionicons name="heart" size={23} color="white" />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </View>
      {rows.length >= 30 && !likes && (
        <Button
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            try {
              const last = rows.at(-1);
              const page = await api<any[]>(
                `${endpoint}?before=${encodeURIComponent(last.created_at)}&before_id=${last.id}`,
              );
              setOlder((v) => [...v, ...page]);
              if (!page.length)
                setError("You’ve reached the end of your connections.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Load more
        </Button>
      )}
      {messages && rows.length > 0 && !visible.length && (
        <Text style={s.muted}>No conversations match your search.</Text>
      )}
      {error && <Text style={s.error}>{error}</Text>}
    </Screen>
  );
}
