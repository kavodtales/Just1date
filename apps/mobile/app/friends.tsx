import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Button, s, colors } from "../components/ui";
export default function Friends() {
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
          onPress={() => router.replace("/(tabs)/discover")}
        >
          <Text style={{ fontFamily: "PoppinsBold", color: colors.pink }}>
            Skip
          </Text>
        </Pressable>
        <Image
          source={require("../assets/contacts.png")}
          style={{
            width: 200,
            height: 215,
            alignSelf: "center",
            marginTop: 100,
            marginBottom: 90,
          }}
          contentFit="contain"
        />
        <Text style={[s.h2, { textAlign: "center" }]}>Search friends</Text>
        <Text style={[s.muted, { textAlign: "center", marginTop: 12 }]}>
          Contact matching is not available yet. Your contact list stays on your
          device.
        </Text>
        <View style={{ marginTop: 145 }}>
          <Button disabled onPress={() => {}}>
            Access to a contact list
          </Button>
        </View>
        <Pressable
          style={s.link}
          onPress={() => router.replace("/(tabs)/discover")}
        >
          <Text
            style={{
              fontFamily: "PoppinsBold",
              color: colors.pink,
              textAlign: "center",
            }}
          >
            Continue to discovery
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
