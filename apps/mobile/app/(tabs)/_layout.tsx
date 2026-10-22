import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";
import { colors } from "../../components/ui";
export default function Layout() {
  const icons: Record<string, any> = {
    discover: "copy",
    likes: "heart-outline",
    matches: "heart",
    messages: "chatbubble-ellipses",
    dates: "calendar-outline",
    profile: "person",
  };
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: "#aaa8b5",
        tabBarStyle: {
          backgroundColor: "#fff9fc",
          borderTopColor: colors.line,
          height: 81,
          paddingBottom: 20,
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, fontFamily: "PoppinsSemiBold" },
        tabBarIcon: ({ color, focused }) => (
          <View
            style={{
              borderTopWidth: 2,
              borderTopColor: focused ? colors.pink : "transparent",
              height: 36,
              width: 52,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={icons[route.name]} color={color} size={23} />
          </View>
        ),
      })}
    >
      {["discover", "likes", "matches", "messages", "dates", "profile"].map(
        (name) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: name.charAt(0).toUpperCase() + name.slice(1),
              ...(name === "likes" ? { href: null } : {}),
            }}
          />
        ),
      )}
    </Tabs>
  );
}
