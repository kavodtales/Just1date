import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { appImageSlots, type AppImage } from "@just1date/config";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Button, colors } from "./ui";
const slides = [
  {
    title: "A little curiosity.",
    text: "Your intentions and preferences help us find connections worth exploring.",
    image: require("../assets/editorial/amara.webp"),
  },
  {
    title: "A better hello.",
    text: "Shared interests. Mutual intention. A conversation worth making time for.",
    image: require("../assets/editorial/tomi.webp"),
  },
  {
    title: "Just one date.",
    text: "Turn a spark into a plan you both choose. Your next good story could start here.",
    image: require("../assets/editorial/venue.webp"),
  },
];
export function Welcome() {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const media = useQuery({
    queryKey: ["app-media"],
    queryFn: async () => {
      if (!process.env.EXPO_PUBLIC_API_URL) return [] as AppImage[];
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/v1/app-media`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!response.ok) throw new Error("Images unavailable");
      return (await response.json()).data as AppImage[];
    },
    staleTime: 60000,
    refetchInterval: 60000,
    retry: 1,
  });
  const remote = media.data?.find((p) => p.slot === appImageSlots[index].slot);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const photoHeight = Math.min(
    index === 2 ? 364 : 417,
    Math.max(
      160,
      height - insets.top - insets.bottom - (index === 2 ? 375 : 333),
    ),
  );
  return (
    <SafeAreaView style={st.screen}>
      <ScrollView contentContainerStyle={st.container}>
        <Image
          source={
            remote?.url && remote.url !== failed
              ? { uri: remote.url }
              : slides[index].image
          }
          onError={() => setFailed(remote?.url ?? null)}
          style={[
            st.photo,
            { height: photoHeight },
            index === 2 && { marginHorizontal: 23, marginTop: 12 },
          ]}
          contentFit="cover"
          accessibilityLabel={
            remote?.url && remote.url !== failed
              ? remote.alt_text
              : appImageSlots[index].alt
          }
        />
        <View style={st.copy}>
          <Text
            style={{
              fontSize: 9,
              letterSpacing: 1.5,
              color: colors.pink,
              fontFamily: "PoppinsSemiBold",
              marginBottom: 8,
            }}
          >
            MAKE ROOM FOR POSSIBILITY
          </Text>
          <Text accessibilityRole="header" style={st.title}>
            {slides[index].title}
          </Text>
          <Text style={st.description}>{slides[index].text}</Text>
        </View>
        <Text style={st.disclosure}>
          AI-created illustrative photography · Fictional adults, not members
        </Text>
        <View style={st.dots}>
          {slides.map((slide, i) => (
            <Pressable
              key={slide.title}
              accessibilityRole="button"
              accessibilityLabel={`Show ${slide.title}`}
              accessibilityState={{ selected: i === index }}
              style={st.dotButton}
              onPress={() => setIndex(i)}
            >
              <View
                style={[
                  st.dot,
                  i === index && { backgroundColor: colors.pink },
                ]}
              />
            </Pressable>
          ))}
        </View>
        <View style={st.bottom}>
          <Button onPress={() => router.push("/signup")}>
            Create an account
          </Button>
          <Pressable
            onPress={() => router.push("/auth")}
            style={st.signIn}
            accessibilityRole="button"
          >
            <Text style={st.account}>
              Already have an account?{" "}
              <Text style={{ color: colors.pink, fontFamily: "PoppinsBold" }}>
                Sign In
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  container: {
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 20,
  },
  photo: { height: 417, marginHorizontal: 18, marginTop: 12, borderRadius: 28 },
  copy: {
    paddingHorizontal: 40,
    paddingTop: 24,
    minHeight: 150,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    color: colors.purple,
    fontFamily: "PoppinsBold",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
    textAlign: "center",
    fontFamily: "Poppins",
  },
  dots: { flexDirection: "row", justifyContent: "center" },
  dotButton: {
    width: 20,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#e7e7e7" },
  bottom: { paddingHorizontal: 40, paddingTop: 28 },
  signIn: {
    minHeight: 44,
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  account: { fontSize: 14, color: "#555", fontFamily: "Poppins" },
  disclosure: {
    textAlign: "center",
    fontSize: 10,
    color: colors.muted,
    paddingHorizontal: 25,
    marginTop: 8,
    fontFamily: "Poppins",
  },
});
