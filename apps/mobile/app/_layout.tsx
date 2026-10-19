import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
  focusManager,
} from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Network from "expo-network";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { auth } from "../lib/auth";
import { useFonts } from "expo-font";
import { AppState } from "react-native";
import { registerGlobals } from "@livekit/react-native";
import { IncomingNativeCall } from "../components/call-invitation";
import * as SplashScreen from "expo-splash-screen";
registerGlobals();
void SplashScreen.preventAutoHideAsync();
export default function Layout() {
  const [fonts, fontError] = useFonts({
    Poppins: require("../assets/fonts/Poppins-Regular.ttf"),
    PoppinsSemiBold: require("../assets/fonts/Poppins-SemiBold.ttf"),
    PoppinsBold: require("../assets/fonts/Poppins-Bold.ttf"),
  });
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30000, gcTime: 300000 },
        },
      }),
  );
  useEffect(() => { if (fonts || fontError) void SplashScreen.hideAsync(); }, [fonts, fontError]);
  useEffect(() => {
    const focus = AppState.addEventListener("change", (state) =>
      focusManager.setFocused(state === "active"),
    );
    const n = Network.addNetworkStateListener((state) =>
      onlineManager.setOnline(Boolean(state.isConnected)),
    );
    const a = auth?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") client.clear();
    });
    const push = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data ?? {};
        const id = data.resource_id;
        if (typeof id === "string" && /^[0-9a-f-]{36}$/.test(id)) {
          if (data.kind === "message") router.push(`/messages/${id}`);
          else if (data.kind === "match") router.push("/(tabs)/matches");
          else if (data.kind === "call") router.push(`/calls/${id}`);
        }
      },
    );
    return () => {
      n.remove();
      focus.remove();
      a?.data.subscription.unsubscribe();
      push.remove();
    };
  }, [client]);
  if (!fonts && !fontError) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={client}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
        <IncomingNativeCall />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
