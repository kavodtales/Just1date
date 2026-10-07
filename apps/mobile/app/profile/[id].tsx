import { useState } from "react";
import {
  Text,
  TextInput,
  View,
  Pressable,
  ScrollView,
  Modal,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Crypto from "expo-crypto";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Status, Button, s, colors } from "../../components/ui";
import { Reactions, type Reaction } from "../../components/reactions";
export default function Profile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({
    queryKey: ["profile", id],
    queryFn: () => api(`profiles/${id}`),
  });
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [report, setReport] = useState(""),
    [busy, setBusy] = useState(false),
    [expanded, setExpanded] = useState(false),
    [photo, setPhoto] = useState<number | null>(null);
  const { height } = useWindowDimensions(),
    p = q.data;
  async function action(path: string, body: unknown, success: string) {
    setBusy(true);
    setError("");
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
      setMessage(success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={{
          width: "100%",
          maxWidth: 500,
          alignSelf: "center",
          paddingBottom: 40,
        }}
      >
        {q.isPending || q.error ? (
          <View style={{ padding: 40, paddingTop: 80 }}>
            <Status
              pending={q.isPending}
              error={q.error}
              retry={() => q.refetch()}
            />
          </View>
        ) : null}
        {p && (
          <>
            <View style={{ height: 393 }}>
              {p.photos?.[0] ? (
                <Image
                  source={{ uri: p.photos[0] }}
                  cachePolicy="memory"
                  style={{ width: "100%", height: 393 }}
                  contentFit="cover"
                  accessibilityLabel={p.display_name}
                />
              ) : (
                <View
                  style={{
                    height: 393,
                    backgroundColor: colors.soft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={[s.h2, { fontSize: 50, color: colors.pink }]}>
                    {p.display_name[0]}
                  </Text>
                </View>
              )}
              <Pressable
                style={[
                  s.square,
                  {
                    position: "absolute",
                    top: 44,
                    left: 40,
                    backgroundColor: "#ffffff20",
                    borderColor: "#ffffffaa",
                  },
                ]}
                accessibilityLabel="Back to discovery"
                onPress={() =>
                  router.canGoBack()
                    ? router.back()
                    : router.push("/(tabs)/discover")
                }
              >
                <Ionicons name="chevron-back" color="white" size={23} />
              </Pressable>
            </View>
            <View
              style={{
                marginTop: -7,
                borderTopLeftRadius: 30,
                borderTopRightRadius: 30,
                backgroundColor: "white",
                paddingHorizontal: 40,
                paddingTop: 88,
              }}
            >
              <View
                style={{ position: "absolute", top: -70, left: 40, right: 40 }}
              >
                <Reactions
                  disabled={busy}
                  onAction={(type: Reaction) =>
                    action(
                      type,
                      { target_id: id, operation_id: Crypto.randomUUID() },
                      type === "passes"
                        ? "You passed on this profile."
                        : "Your like is recorded. Check Matches to see if it’s mutual.",
                    )
                  }
                />
              </View>
              <View style={s.row}>
                <Text style={s.h2}>
                  {p.display_name}, {p.age}
                </Text>
                <Pressable
                  accessibilityLabel="View your compatibility"
                  style={s.square}
                  onPress={() => router.push(`/matchmaker?target=${id}`)}
                >
                  <Ionicons
                    name="paper-plane-outline"
                    size={23}
                    color={colors.pink}
                  />
                </Pressable>
              </View>
              <Text style={[s.muted, { marginTop: 2, marginBottom: 32 }]}>
                {p.profession || "Profession not shared"}
              </Text>
              <Text style={{ fontFamily: "PoppinsBold", fontSize: 16 }}>
                Location
              </Text>
              <Text style={[s.muted, { marginTop: 8, marginBottom: 32 }]}>
                {p.city}
              </Text>
              {p.verified && (
                <Text
                  style={{
                    color: colors.pink,
                    fontFamily: "PoppinsSemiBold",
                    marginBottom: 20,
                  }}
                >
                  ✓ Selfie verified
                </Text>
              )}
              <Text style={{ fontFamily: "PoppinsBold", fontSize: 16 }}>
                About
              </Text>
              <Text style={[s.muted, { marginTop: 8 }]}>
                {expanded || p.bio?.length < 180
                  ? p.bio
                  : `${p.bio?.slice(0, 180)}…`}
              </Text>
              {p.bio?.length >= 180 && (
                <Pressable
                  style={{ minHeight: 44, justifyContent: "center" }}
                  onPress={() => setExpanded((v) => !v)}
                >
                  <Text
                    style={{ color: colors.pink, fontFamily: "PoppinsBold" }}
                  >
                    {expanded ? "Read less" : "Read more"}
                  </Text>
                </Pressable>
              )}
              <Text
                style={{
                  fontFamily: "PoppinsBold",
                  fontSize: 16,
                  marginTop: 32,
                  marginBottom: 12,
                }}
              >
                Interests
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {p.interests.map((i: string) => (
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: colors.line,
                      borderRadius: 4,
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                    }}
                    key={i}
                  >
                    <Text style={{ fontFamily: "Poppins", fontSize: 14 }}>
                      {i.replaceAll("_", " ")}
                    </Text>
                  </View>
                ))}
              </View>
              {p.photos?.length > 0 && (
                <>
                  <View style={[s.row, { marginTop: 32, marginBottom: 10 }]}>
                    <Text style={{ fontFamily: "PoppinsBold", fontSize: 16 }}>
                      Gallery
                    </Text>
                    <Pressable
                      style={{ minHeight: 44, justifyContent: "center" }}
                      onPress={() => setPhoto(0)}
                    >
                      <Text
                        style={{
                          fontFamily: "PoppinsBold",
                          color: colors.pink,
                        }}
                      >
                        See all
                      </Text>
                    </Pressable>
                  </View>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}
                  >
                    {p.photos.map((uri: string, i: number) => (
                      <Pressable
                        key={uri}
                        accessibilityLabel={`Open photo ${i + 1}`}
                        onPress={() => setPhoto(i)}
                        style={{
                          width: "47.5%",
                          height: 195,
                          borderRadius: 12,
                          overflow: "hidden",
                        }}
                      >
                        <Image
                          source={{ uri }}
                          style={{ width: "100%", height: "100%" }}
                          cachePolicy="memory"
                          contentFit="cover"
                        />
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
              <Text
                style={{
                  fontFamily: "PoppinsBold",
                  fontSize: 16,
                  marginTop: 32,
                }}
              >
                Looking for
              </Text>
              <Text style={s.muted}>{p.goal.replaceAll("_", " ")}</Text>
              {p.prompts.map((prompt: any, i: number) => (
                <View style={{ marginTop: 24 }} key={i}>
                  <Text style={{ fontFamily: "PoppinsBold" }}>
                    {prompt.question}
                  </Text>
                  <Text style={s.muted}>{prompt.answer}</Text>
                </View>
              ))}
              <View style={{ gap: 15, marginTop: 32 }}>
                <Button
                  disabled={busy}
                  onPress={() =>
                    action(
                      "blocks",
                      { target_id: id },
                      "This profile is blocked and the conversation is closed.",
                    )
                  }
                >
                  Block this person
                </Button>
                <Text style={s.label}>Report a concern</Text>
                <TextInput
                  multiline
                  value={report}
                  onChangeText={setReport}
                  accessibilityLabel="Report details"
                  placeholder="What should the moderation team know?"
                  style={s.input}
                />
                <Button
                  disabled={busy || report.trim().length < 10}
                  onPress={() =>
                    action(
                      "reports",
                      { target_id: id, category: "other", details: report },
                      "Report saved for human review.",
                    )
                  }
                >
                  Submit report
                </Button>
              </View>
            </View>
          </>
        )}
        {message && (
          <Text style={[s.muted, { paddingHorizontal: 40, marginTop: 20 }]}>
            {message}
          </Text>
        )}
        {error && (
          <Text style={[s.error, { marginHorizontal: 40, marginTop: 20 }]}>
            {error}
          </Text>
        )}
      </ScrollView>
      {photo !== null && p && (
        <Modal animationType="slide" onRequestClose={() => setPhoto(null)}>
          <View style={[s.screen, { paddingTop: 44 }]}>
            <Pressable
              style={[s.square, { marginLeft: 40, marginBottom: 24 }]}
              accessibilityLabel="Close gallery"
              onPress={() => setPhoto(null)}
            >
              <Ionicons name="chevron-back" size={23} color={colors.pink} />
            </Pressable>
            <Image
              source={{ uri: p.photos[photo] }}
              cachePolicy="memory"
              style={{ width: "100%", height: height - 210 }}
              contentFit="contain"
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                gap: 10,
                padding: 20,
              }}
            >
              {p.photos.map((uri: string, i: number) => (
                <Pressable
                  key={uri}
                  accessibilityLabel={`Show photo ${i + 1}`}
                  accessibilityState={{ selected: photo === i }}
                  onPress={() => setPhoto(i)}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 10,
                    overflow: "hidden",
                    opacity: photo === i ? 1 : 0.4,
                    borderWidth: 2,
                    borderColor: photo === i ? colors.pink : "transparent",
                  }}
                >
                  <Image
                    source={{ uri }}
                    style={{ width: "100%", height: "100%" }}
                    cachePolicy="memory"
                  />
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
