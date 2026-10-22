import { useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Profile } from "@just1date/types";
import { api } from "../../lib/api";
import { Button, Screen, Status, s, colors } from "../../components/ui";
import { Filters } from "../../components/filters";
import { Reactions, type Reaction } from "../../components/reactions";
import { MatchCelebration } from "../../components/match-celebration";
export default function Discover() {
  const { height } = useWindowDimensions();
  const photoStyle = [
    styles.image,
    { height: Math.max(310, Math.min(540, height * 0.57)) },
  ];
  const qc = useQueryClient();
  const [index, setIndex] = useState(0),
    [cursor, setCursor] = useState<string | null>(null),
    [notice, setNotice] = useState("");
  const q = useQuery({
    queryKey: ["discover", cursor],
    queryFn: () =>
      api<{ items: Profile[]; next_cursor: string | null }>(
        `profiles/discover${cursor ? `?cursor=${cursor}` : ""}`,
      ),
  });
  const p = q.data?.items[index];
  const [filters, setFilters] = useState(false);
  const [match, setMatch] = useState<{
    profile: Profile;
    conversation: string;
  } | null>(null);
  const operation = useRef<{
    target: string;
    action: string;
    id: string;
  } | null>(null);
  const x = useSharedValue(0);
  const mutation = useMutation({
    mutationFn: async (action: Reaction) => {
      if (!p) return;
      if (
        operation.current?.target !== p.user_id ||
        operation.current?.action !== action
      )
        operation.current = {
          target: p.user_id,
          action,
          id: Crypto.randomUUID(),
        };
      const result = await api(action, {
        method: "POST",
        body: JSON.stringify({
          target_id: p.user_id,
          operation_id: operation.current.id,
        }),
      });
      return { ...result, profile: p };
    },
    onSuccess: (r) => {
      operation.current = null;
      setIndex((i) => i + 1);
      x.value = 0;
      setNotice(r?.matched ? "It’s mutual! Visit Matches to say hello." : "");
      if (r?.matched && r.conversation_id)
        setMatch({ profile: r.profile, conversation: r.conversation_id });
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
  });
  const act = (action: Reaction) => {
    if (p && !mutation.isPending) mutation.mutate(action);
  };
  const gesture = Gesture.Pan()
    .enabled(Boolean(p) && !mutation.isPending)
    .onUpdate((e) => {
      x.value = e.translationX;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > 110)
        runOnJS(act)(e.translationX > 0 ? "likes" : "passes");
      x.value = withSpring(0);
    });
  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { rotate: `${Math.max(-18, Math.min(18, x.value / 10))}deg` },
    ],
  }));
  const likeFeedback = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, (x.value - 25) / 75)),
  }));
  return (
    <Screen
      title="Discover"
      centered
      contentStyle={{ gap: 0 }}
      headerAction={
        <Pressable
          accessibilityLabel="Open filters"
          style={s.square}
          onPress={() => setFilters(true)}
        >
          <Ionicons name="options-outline" size={23} color={colors.pink} />
        </Pressable>
      }
    >
      {filters && (
        <Filters
          onClose={() => {
            setFilters(false);
            setIndex(0);
            setCursor(null);
          }}
        />
      )}
      {match && (
        <MatchCelebration
          profile={match.profile}
          conversation={match.conversation}
          onClose={() => setMatch(null)}
        />
      )}
      <Status
        pending={q.isPending}
        error={q.error}
        empty={
          !q.isPending && !q.error && !p
            ? "New possibilities are on their way."
            : undefined
        }
        retry={() => q.refetch()}
      />
      {p && (
        <>
          <View style={{ position: "relative" }}>
            {q.data?.items
              .slice(index + 1, index + 3)
              .reverse()
              .map((next, layer) => (
                <View
                  key={next.user_id}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={[
                    StyleSheet.absoluteFill,
                    styles.card,
                    {
                      transform: [
                        { translateY: 8 + layer * 8 },
                        { scale: 0.94 + layer * 0.03 },
                      ],
                    },
                  ]}
                >
                  {next.photos?.[0] && (
                    <Image
                      source={{ uri: next.photos[0] }}
                      cachePolicy="memory"
                      style={photoStyle}
                      contentFit="cover"
                    />
                  )}
                  <View style={styles.caption}>
                    <Text
                      style={{
                        color: "white",
                        fontFamily: "PoppinsSemiBold",
                        fontSize: 24,
                      }}
                    >
                      {next.display_name}, {next.age}
                    </Text>
                    <Text
                      style={{
                        color: "white",
                        fontFamily: "Poppins",
                        fontSize: 14,
                      }}
                    >
                      {next.profession}
                    </Text>
                  </View>
                </View>
              ))}
            <GestureDetector gesture={gesture}>
              <Animated.View style={[styles.card, animated]}>
                <Pressable
                  accessibilityLabel={`View ${p.display_name}'s profile`}
                  onPress={() => router.push(`/profile/${p.user_id}`)}
                >
                  {p.photos?.[0] ? (
                    <Image
                      source={{ uri: p.photos[0] }}
                      style={photoStyle}
                      contentFit="cover"
                      cachePolicy="memory"
                      accessibilityLabel="Approved profile photo"
                    />
                  ) : (
                    <View style={[...photoStyle, styles.noPhoto]}>
                      <Text>Photo unavailable</Text>
                    </View>
                  )}
                  <View
                    style={{
                      position: "absolute",
                      top: 54,
                      left: 16,
                      borderRadius: 7,
                      backgroundColor: "#ffffff35",
                      padding: 8,
                      flexDirection: "row",
                      gap: 3,
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="location-outline" size={14} color="white" />
                    <Text
                      style={{
                        fontFamily: "Poppins",
                        fontSize: 12,
                        color: "white",
                      }}
                    >
                      {p.city}
                    </Text>
                  </View>
                  <Animated.View
                    pointerEvents="none"
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        backgroundColor: "#df359440",
                        justifyContent: "center",
                        alignItems: "center",
                      },
                      likeFeedback,
                    ]}
                  >
                    <View
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: "white",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="heart" size={42} color={colors.pink} />
                    </View>
                  </Animated.View>
                  <View style={styles.caption}>
                    <Text
                      style={{
                        color: "white",
                        fontSize: 24,
                        fontFamily: "PoppinsSemiBold",
                      }}
                    >
                      {p.display_name}, {p.age}
                    </Text>
                    <Text
                      style={{
                        color: "white",
                        fontSize: 14,
                        fontFamily: "Poppins",
                      }}
                    >
                      {p.profession || p.goal.replaceAll("_", " ")}
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
            </GestureDetector>
          </View>
          <Reactions disabled={mutation.isPending} onAction={act} />
        </>
      )}
      {!p && q.data?.next_cursor && (
        <Button
          onPress={() => {
            setCursor(q.data!.next_cursor);
            setIndex(0);
          }}
        >
          See more profiles
        </Button>
      )}
      {mutation.error && (
        <Text accessibilityLiveRegion="polite" style={s.error}>
          {mutation.error.message}
        </Text>
      )}
      {notice && <Text style={s.muted}>{notice}</Text>}
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    backgroundColor: "white",
    borderWidth: 0,
    overflow: "hidden",
  },
  image: { width: "100%", height: 484 },
  noPhoto: {
    backgroundColor: "#e9e1d6",
    justifyContent: "center",
    alignItems: "center",
  },
  caption: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 84,
    paddingHorizontal: 22,
    paddingVertical: 18,
    backgroundColor: "#29132fe8",
    gap: 2,
  },
  summary: { padding: 20, paddingTop: 0, gap: 12 },
  score: { color: "#a08460", fontSize: 12 },
  bio: { fontSize: 13, color: "#79766f", lineHeight: 22 },
});
