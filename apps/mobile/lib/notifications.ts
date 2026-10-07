import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { api } from "./api";
export async function enableNotifications() {
  // Validate member session and configured delivery before requesting permission.
  await api("profiles/me");
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId)
    throw new Error(
      "Notification delivery is being prepared. Please try again later.",
    );
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("connections", {
      name: "Connections",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted")
    throw new Error(
      "Notifications are optional. You can enable them in device settings later.",
    );
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  await api("notifications/devices", {
    method: "POST",
    body: JSON.stringify({ token: token.data, platform: Platform.OS }),
  });
  await api("notifications/preferences", {
    method: "PATCH",
    body: JSON.stringify({ push_enabled: true }),
  });
}
