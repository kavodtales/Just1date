import { Modal, View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { Profile } from "@just1date/types";
import { api } from "../lib/api";
import { Button, s, colors } from "./ui";
export function MatchCelebration({
  profile,
  conversation,
  onClose,
}: {
  profile: Profile;
  conversation: string;
  onClose: () => void;
}) {
  const own = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Profile>("profiles/me"),
  });
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "white",
          paddingHorizontal: 40,
          paddingTop: 80,
          paddingBottom: 48,
          justifyContent: "space-between",
        }}
      >
        <View>
          {profile.photos?.[0] && own.data?.photos?.[0] && (
            <View style={{ height: 350 }}>
              <Image
                source={{ uri: own.data.photos[0] }}
                cachePolicy="memory"
                style={{
                  width: 160,
                  height: 245,
                  position: "absolute",
                  top: 0,
                  right: 10,
                  borderRadius: 15,
                  transform: [{ rotate: "10deg" }],
                }}
              />
              <Image
                source={{ uri: profile.photos[0] }}
                cachePolicy="memory"
                style={{
                  width: 160,
                  height: 245,
                  position: "absolute",
                  bottom: 20,
                  left: 10,
                  borderRadius: 15,
                  transform: [{ rotate: "-10deg" }],
                }}
              />
            </View>
          )}
          <Text
            style={{
              fontFamily: "PoppinsBold",
              fontSize: 32,
              textAlign: "center",
              color: colors.pink,
              marginTop: 30,
            }}
          >
            It’s a match, Yes!
          </Text>
          <Text style={[s.muted, { textAlign: "center", marginTop: 5 }]}>
            Start a conversation now with each other.
          </Text>
        </View>
        <View style={{ gap: 20 }}>
          <Button
            onPress={() => {
              onClose();
              router.push(`/messages/${conversation}`);
            }}
          >
            Say hi
          </Button>
          <Pressable
            accessibilityRole="button"
            style={[s.button, { backgroundColor: colors.soft }]}
            onPress={onClose}
          >
            <Text
              style={{
                fontFamily: "PoppinsBold",
                color: colors.pink,
                fontSize: 15,
              }}
            >
              Keep swiping
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
