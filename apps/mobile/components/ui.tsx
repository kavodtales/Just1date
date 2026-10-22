import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  StyleSheet,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
export const colors = {
  ink: "#291d2d",
  paper: "#fff9fc",
  gold: "#bd286d",
  pink: "#bd286d",
  muted: "#756675",
  line: "#eadfe7",
  soft: "#f9e9f1",
  purple: "#321c3c",
};
export function Screen({
  title,
  children,
  scroll = true,
  headerAction,
  centered = false,
  subtitle,
  contentStyle,
}: {
  title: string;
  children: ReactNode;
  scroll?: boolean;
  headerAction?: ReactNode;
  centered?: boolean;
  subtitle?: string;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
      <View style={[s.header, centered && { marginBottom: 7 }]}>
        {centered && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={s.square}
            onPress={() =>
              router.canGoBack() ? router.back() : router.push("/")
            }
          >
            <Ionicons name="chevron-back" size={22} color={colors.pink} />
          </Pressable>
        )}
        <View
          style={centered ? { flex: 1, alignItems: "center" } : { flex: 1 }}
        >
          {!centered && (
            <Text style={s.eyebrow}>MAKE ROOM FOR POSSIBILITY</Text>
          )}
          <Text
            accessibilityRole="header"
            style={[s.title, centered && { fontSize: 24 }]}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Poppins",
                color: colors.muted,
              }}
            >
              {subtitle}
            </Text>
          )}
        </View>
        {headerAction ?? (
          <Pressable
            accessibilityLabel="Open account settings"
            style={s.square}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <Ionicons name="options-outline" size={23} color={colors.pink} />
          </Pressable>
        )}
      </View>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[s.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[s.content, { flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
export function Button({
  children,
  onPress,
  disabled = false,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[s.button, disabled && { opacity: 0.5 }]}
    >
      <Text style={s.buttonText}>{children}</Text>
    </Pressable>
  );
}
export function Status({
  pending,
  error,
  empty,
  retry,
}: {
  pending: boolean;
  error: Error | null;
  empty?: string;
  retry: () => void;
}) {
  if (pending)
    return (
      <View style={s.state}>
        <ActivityIndicator color={colors.pink} />
        <Text style={s.muted}>Loading your experience…</Text>
      </View>
    );
  if (error)
    return (
      <View style={s.state}>
        <Ionicons name="heart-outline" size={50} color={colors.pink} />
        <Text accessibilityRole="header" style={s.stateTitle}>
          Let’s get you connected.
        </Text>
        <Text accessibilityLiveRegion="polite" style={s.muted}>
          {error.message}
        </Text>
        <Button onPress={retry}>Try again</Button>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/signup")}
          style={s.link}
        >
          <Text
            style={{
              color: colors.pink,
              fontFamily: "PoppinsSemiBold",
              textAlign: "center",
            }}
          >
            Sign in or create an account
          </Text>
        </Pressable>
      </View>
    );
  if (empty)
    return (
      <View style={s.state}>
        <Ionicons name="heart-outline" size={50} color={colors.pink} />
        <Text style={s.stateTitle}>{empty}</Text>
        <Button onPress={() => router.push("/(tabs)/discover")}>
          Keep swiping
        </Button>
      </View>
    );
  return null;
}
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    gap: 10,
    minHeight: 71,
  },
  brand: { fontSize: 28, fontFamily: "PoppinsBold", color: colors.pink },
  safety: { fontSize: 14, color: colors.pink },
  eyebrow: { fontSize: 10, color: colors.pink, fontFamily: "PoppinsSemiBold" },
  title: {
    fontSize: 32,
    fontFamily: "PoppinsBold",
    color: colors.ink,
    lineHeight: 40,
    letterSpacing: -0.6,
  },
  content: { paddingHorizontal: 24, paddingBottom: 35, gap: 18 },
  square: {
    height: 51,
    width: 51,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    minHeight: 56,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
    backgroundColor: colors.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "white", fontSize: 15, fontFamily: "PoppinsBold" },
  state: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "white",
    alignItems: "center",
    gap: 20,
    minHeight: 340,
    justifyContent: "center",
  },
  orbit: { fontSize: 65, color: colors.pink },
  stateTitle: {
    fontFamily: "PoppinsBold",
    fontSize: 24,
    textAlign: "center",
    color: colors.ink,
  },
  muted: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 21,
    fontFamily: "Poppins",
  },
  link: { padding: 12, minHeight: 44 },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
    gap: 12,
  },
  label: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 8,
    fontFamily: "Poppins",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "white",
    borderRadius: 15,
    padding: 16,
    minHeight: 56,
    color: colors.ink,
    fontFamily: "Poppins",
  },
  error: {
    padding: 15,
    borderRadius: 10,
    color: "#8f285f",
    backgroundColor: colors.soft,
    fontSize: 12,
    fontFamily: "Poppins",
  },
  h2: { fontSize: 24, fontFamily: "PoppinsBold", color: colors.ink },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
  },
});
