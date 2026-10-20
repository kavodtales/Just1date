import { useEffect, useRef, useState } from "react";
import {
  AppState,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { api } from "../../lib/api";
import { Status, colors } from "../../components/ui";

export default function PhotoStory() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    qc = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile", id],
    queryFn: () => api(`profiles/${id}`),
  });
  const inbox = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api<any[]>("conversations"),
  });
  const [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(false),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false),
    [broken, setBroken] = useState(false);
  const operation = useRef<{ body: string; id: string } | null>(null);
  const photos: string[] = profile.data?.photos ?? [];
  const position = Math.min(index, Math.max(0, photos.length - 1));
  const conversation = inbox.data?.find(
    (row) => row.profile.user_id === id,
  )?.conversation_id;
  const close = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)/messages");
  function move(delta: number) {
    setIndex(Math.max(0, Math.min(photos.length - 1, position + delta)));
    setBroken(false);
  }
  useEffect(() => {
    if (!playing || text || busy || broken || !photos.length) return;
    const timer = setInterval(() => {
      if (AppState.currentState !== "active") return;
      if (position === photos.length - 1) setPlaying(false);
      else {
        setIndex(position + 1);
        setBroken(false);
      }
    }, 6000);
    return () => clearInterval(timer);
  }, [playing, text, busy, broken, position, photos.length]);
  async function reply() {
    const body = text.trim();
    if (!conversation || !body || busy) return;
    if (operation.current?.body !== body)
      operation.current = { body, id: Crypto.randomUUID() };
    setBusy(true);
    setError("");
    setSent(false);
    try {
      await api(`conversations/${conversation}/messages`, {
        method: "POST",
        body: JSON.stringify({
          body,
          client_id: operation.current.id,
          reply_to: null,
        }),
      });
      operation.current = null;
      setText("");
      setSent(true);
      qc.invalidateQueries({ queryKey: ["messages", conversation] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={st.screen}>
      <StatusBar style="light" />
      {photos[position] && !broken && (
        <Image
          source={{ uri: photos[position] }}
          cachePolicy="memory"
          contentFit="cover"
          style={StyleSheet.absoluteFill}
          accessibilityLabel={`${profile.data.display_name}, photo ${position + 1}`}
          onError={() => {
            setBroken(true);
            setPlaying(false);
          }}
        />
      )}
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: "#00000020" }]}
        pointerEvents="none"
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={st.header}>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {photos.map((_, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`Show photo ${i + 1}`}
                accessibilityState={{ selected: i === position }}
                onPress={() => {
                  setIndex(i);
                  setBroken(false);
                }}
                style={{ flex: 1, paddingVertical: 12 }}
              >
                <View
                  style={{
                    height: 2,
                    backgroundColor: i <= position ? colors.pink : "#ffffff80",
                  }}
                />
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              style={{
                flexDirection: "row",
                gap: 10,
                flex: 1,
                alignItems: "center",
              }}
              accessibilityLabel="Open profile"
              onPress={() => router.push(`/profile/${id}`)}
            >
              {photos[0] && (
                <Image
                  source={{ uri: photos[0] }}
                  cachePolicy="memory"
                  style={{ width: 48, height: 48, borderRadius: 24 }}
                />
              )}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={st.name}>
                  {profile.data?.display_name ?? "Profile photos"}
                </Text>
                <Text style={st.small}>Profile photos</Text>
              </View>
            </Pressable>
            <Pressable
              style={st.control}
              accessibilityRole="button"
              accessibilityLabel={playing ? "Pause photos" : "Play photos"}
              disabled={!photos.length}
              onPress={() => setPlaying(!playing)}
            >
              <Ionicons
                name={playing ? "pause" : "play"}
                size={19}
                color="white"
              />
            </Pressable>
            <Pressable
              style={st.control}
              accessibilityRole="button"
              accessibilityLabel="Close photo viewer"
              onPress={close}
            >
              <Ionicons name="close" size={23} color="white" />
            </Pressable>
          </View>
        </View>
        <View style={st.navigation}>
          <Pressable
            style={st.photoNav}
            accessibilityRole="button"
            accessibilityLabel="Previous photo"
            disabled={position === 0}
            onPress={() => move(-1)}
          >
            {position > 0 && (
              <Ionicons name="chevron-back" size={24} color="white" />
            )}
          </Pressable>
          <Pressable
            style={[st.photoNav, { alignItems: "flex-end" }]}
            accessibilityRole="button"
            accessibilityLabel="Next photo"
            disabled={position >= photos.length - 1}
            onPress={() => move(1)}
          >
            {position < photos.length - 1 && (
              <Ionicons name="chevron-forward" size={24} color="white" />
            )}
          </Pressable>
        </View>
        {(profile.isPending ||
          profile.error ||
          broken ||
          (profile.data && !photos.length)) && (
          <View style={st.state}>
            <Status
              pending={profile.isPending}
              error={profile.error}
              retry={() => profile.refetch()}
            />
            {broken && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setBroken(false);
                  profile.refetch();
                }}
              >
                <Text style={st.notice}>
                  Photo could not load. Tap to reload.
                </Text>
              </Pressable>
            )}
            {profile.data && !photos.length && (
              <Text style={st.notice}>No approved photos to show.</Text>
            )}
          </View>
        )}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={st.footer}
        >
          {error && (
            <Text accessibilityLiveRegion="polite" style={st.notice}>
              {error}
            </Text>
          )}
          {sent && (
            <Pressable onPress={() => router.push(`/messages/${conversation}`)}>
              <Text accessibilityLiveRegion="polite" style={st.notice}>
                Message sent. Open conversation
              </Text>
            </Pressable>
          )}
          {conversation ? (
            <View style={{ flexDirection: "row", gap: 14 }}>
              <TextInput
                style={st.input}
                placeholder="Your message"
                placeholderTextColor="white"
                accessibilityLabel="Your message"
                value={text}
                maxLength={2000}
                editable={!busy}
                onFocus={() => setPlaying(false)}
                onChangeText={(value) => {
                  setText(value);
                  setSent(false);
                }}
              />
              <Pressable
                style={st.send}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                disabled={busy || !text.trim()}
                onPress={reply}
              >
                <Ionicons name="paper-plane-outline" size={23} color="white" />
              </Pressable>
            </View>
          ) : (
            <Text style={st.notice}>
              {inbox.isPending
                ? "Checking your connection…"
                : inbox.error
                  ? "Couldn't check your connection. Open Messages to try again."
                  : "A mutual match opens a private conversation."}
            </Text>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#151515" },
  header: { paddingHorizontal: 40, paddingTop: 6, zIndex: 2 },
  name: { fontSize: 15, fontFamily: "PoppinsBold", color: "white" },
  small: { fontSize: 10, fontFamily: "Poppins", color: "white" },
  control: {
    width: 40,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#ffffff20",
    alignItems: "center",
    justifyContent: "center",
  },
  navigation: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  photoNav: { width: "28%", justifyContent: "center", padding: 12 },
  state: {
    position: "absolute",
    top: 145,
    left: 25,
    right: 25,
    bottom: 135,
    justifyContent: "center",
  },
  footer: { paddingHorizontal: 40, paddingBottom: 24, gap: 10 },
  notice: {
    color: "white",
    backgroundColor: "#00000099",
    padding: 12,
    borderRadius: 12,
    fontSize: 12,
    fontFamily: "Poppins",
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: "white",
    borderRadius: 15,
    paddingHorizontal: 15,
    color: "white",
    backgroundColor: "#ffffff20",
    fontFamily: "Poppins",
    fontSize: 13,
  },
  send: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: "white",
    backgroundColor: "#ffffff20",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
