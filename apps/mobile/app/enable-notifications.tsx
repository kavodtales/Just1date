import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { enableNotifications } from "../lib/notifications";
import { Button, s, colors } from "../components/ui";
export default function EnableNotifications() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <SafeAreaView style={s.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 40,
          paddingBottom: 48,
          maxWidth: 500,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <Pressable
          style={{
            alignSelf: "flex-end",
            minHeight: 44,
            justifyContent: "center",
            marginTop: 10,
          }}
          onPress={() => router.replace("/friends")}
        >
          <Text style={{ fontFamily: "PoppinsBold", color: colors.pink }}>
            Skip
          </Text>
        </Pressable>
        <Image
          source={require("../assets/notifications.png")}
          style={{
            width: 207,
            height: 190,
            alignSelf: "center",
            marginTop: 125,
            marginBottom: 90,
          }}
          contentFit="contain"
        />
        <Text style={[s.h2, { textAlign: "center" }]}>
          Enable notification’s
        </Text>
        <Text style={[s.muted, { textAlign: "center", marginTop: 12 }]}>
          Get push-notification when you get the match or receive a message.
        </Text>
        <View style={{ marginTop: 145 }}>
          <Button
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              setError("");
              try {
                await enableNotifications();
                router.replace("/friends");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Please wait…" : "I want to be notified"}
          </Button>
        </View>
        {error && <Text style={[s.error, { marginTop: 15 }]}>{error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}
