import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Button, colors } from "./ui";
const slides = [
  {
    title: "Algorithm",
    text: "Your intentions and preferences help us find connections worth exploring.",
    image: require("../assets/welcome/1.jpg"),
  },
  {
    title: "Matches",
    text: "We match you with people that have a large array of similar interests.",
    image: require("../assets/welcome/2.jpg"),
  },
  {
    title: "Premium",
    text: "Make room for more possibilities with premium benefits.",
    image: require("../assets/welcome/3.jpg"),
  },
];
export function Welcome() {
  const [index, setIndex] = useState(0);
  return (
    <SafeAreaView style={st.screen}>
      <ScrollView contentContainerStyle={st.container}>
        <Image
          source={slides[index].image}
          style={[
            st.photo,
            index === 2 && { height: 364, marginHorizontal: 23, marginTop: 12 },
          ]}
          contentFit="cover"
          accessibilityLabel="Just1date introduction artwork"
        />
        <View style={[st.copy, index === 2 && { paddingTop: 62 }]}>
          <Text accessibilityRole="header" style={st.title}>
            {slides[index].title}
          </Text>
          <Text style={st.description}>{slides[index].text}</Text>
        </View>
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
  screen: { flex: 1, backgroundColor: "white" },
  container: {
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 20,
  },
  photo: { height: 417, marginHorizontal: 15, marginTop: 0 },
  copy: {
    paddingHorizontal: 40,
    paddingTop: 20,
    height: 123,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    color: colors.pink,
    fontFamily: "PoppinsBold",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: "#333557",
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
});
