import { View, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "./ui";
export type Reaction = "likes" | "passes" | "super-likes";
export function Reactions({
  onAction,
  disabled,
}: {
  onAction: (action: Reaction) => void;
  disabled?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 15,
        paddingTop: 21,
        paddingBottom: 24,
      }}
    >
      {(
        [
          ["passes", "close", "#ff781a", 78, 29],
          ["likes", "heart", "white", 100, 52],
          ["super-likes", "star", colors.purple, 78, 31],
        ] as const
      ).map(([action, icon, color, size, glyph]) => (
        <Pressable
          key={action}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={
            action === "likes"
              ? "Like this profile"
              : action === "passes"
                ? "Pass on this profile"
                : "Super Like this profile"
          }
          onPress={() => onAction(action)}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: action === "likes" ? colors.pink : "white",
            alignItems: "center",
            justifyContent: "center",
            boxShadow:
              action === "likes"
                ? "0 14px 20px #df359430"
                : "0 12px 36px #00000009",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Ionicons name={icon} size={glyph} color={color} />
        </Pressable>
      ))}
    </View>
  );
}
