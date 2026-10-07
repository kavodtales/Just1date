import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Button, s, colors } from "../components/ui";
export default function Signup() {
  return (
    <SafeAreaView style={s.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 40,
          paddingTop: 80,
          paddingBottom: 40,
          maxWidth: 500,
          alignSelf: "center",
          width: "100%",
        }}
      >
        <Pressable
          accessibilityLabel="Back to welcome"
          onPress={() => router.replace("/")}
        >
          <Image
            source={require("../assets/logo.png")}
            style={{ width: 199, height: 122, alignSelf: "center" }}
            contentFit="contain"
          />
        </Pressable>
        <Text
          style={{
            fontFamily: "PoppinsBold",
            fontSize: 19,
            textAlign: "center",
            marginTop: 62,
            marginBottom: 32,
          }}
        >
          Sign up to continue
        </Text>
        <Button onPress={() => router.push("/auth?mode=register")}>
          Continue with email
        </Button>
        <Pressable
          style={[
            s.button,
            {
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: colors.line,
              marginTop: 20,
            },
          ]}
          accessibilityRole="button"
          onPress={() => router.push("/phone")}
        >
          <Text
            style={{
              color: colors.pink,
              fontFamily: "PoppinsBold",
              fontSize: 15,
            }}
          >
            Use phone number
          </Text>
        </Pressable>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 20,
            marginTop: 62,
            marginBottom: 8,
          }}
        >
          <View style={{ height: 1, backgroundColor: colors.line, flex: 1 }} />
          <Text
            style={{ fontFamily: "Poppins", textAlign: "center", fontSize: 12 }}
          >
            or sign up{"\n"}with
          </Text>
          <View style={{ height: 1, backgroundColor: colors.line, flex: 1 }} />
        </View>
        <View
          style={{ flexDirection: "row", justifyContent: "center", gap: 20 }}
        >
          {(["logo-facebook", "logo-google", "logo-apple"] as const).map(
            (name) => (
              <View
                key={name}
                accessibilityLabel={`${name.replace("logo-", "")} sign-in is not enabled`}
                style={[s.square, { height: 64, width: 64 }]}
              >
                <Ionicons name={name} size={32} color={colors.pink} />
              </View>
            ),
          )}
        </View>
        <Text
          style={{
            fontSize: 10,
            color: "#aaa8b5",
            textAlign: "center",
            marginTop: 10,
          }}
        >
          Social sign-in is not enabled yet.
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 24,
            marginTop: 50,
          }}
        >
          {["terms", "privacy"].map((page) => (
            <Pressable
              key={page}
              style={s.link}
              onPress={() => router.push(`/legal/${page}`)}
            >
              <Text
                style={{
                  color: colors.pink,
                  fontFamily: "Poppins",
                  fontSize: 13,
                }}
              >
                {page === "terms" ? "Terms of use" : "Privacy Policy"}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
