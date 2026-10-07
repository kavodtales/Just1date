import { useState } from "react";
import { Text, TextInput, Switch, Platform } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { auth } from "../../lib/auth";
import { api } from "../../lib/api";
import { Screen, Status, Button, s } from "../../components/ui";
export default function Profile() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["me"], queryFn: () => api("profiles/me") });
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmation, setConfirmation] = useState("");
  async function run(work: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    try {
      await work();
      setMessage(success);
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Your story">
      <Status pending={q.isPending} error={q.error} retry={() => q.refetch()} />
      {q.data && (
        <>
          <Text style={s.h2}>
            {q.data.display_name || "Make it yours"}, {q.data.age}
          </Text>
          <Text style={s.muted}>
            {q.data.city} · {q.data.completion}% complete · {q.data.status}
          </Text>
          <Button onPress={() => router.push("/onboarding")}>
            Edit profile & preferences
          </Button>
          <Text style={s.label}>Pause discovery</Text>
          <Switch
            value={q.data.paused}
            disabled={busy}
            onValueChange={(paused) =>
              run(
                () =>
                  api("privacy", {
                    method: "PATCH",
                    body: JSON.stringify({ paused }),
                  }),
                "Privacy saved.",
              )
            }
          />
          <Button
            disabled={busy}
            onPress={() =>
              run(async () => {
                if (Platform.OS === "android")
                  await Notifications.setNotificationChannelAsync(
                    "connections",
                    {
                      name: "Connections",
                      importance: Notifications.AndroidImportance.DEFAULT,
                    },
                  );
                const granted = await Notifications.requestPermissionsAsync();
                if (granted.status !== "granted")
                  throw new Error(
                    "Notifications are optional. Enable them in device settings if you change your mind.",
                  );
                const projectId = Constants.expoConfig?.extra?.eas?.projectId;
                if (!projectId)
                  throw new Error(
                    "An EAS project must be configured for push delivery.",
                  );
                const token = await Notifications.getExpoPushTokenAsync({
                  projectId,
                });
                await api("notifications/devices", {
                  method: "POST",
                  body: JSON.stringify({
                    token: token.data,
                    platform: Platform.OS,
                  }),
                });
                await api("notifications/preferences", {
                  method: "PATCH",
                  body: JSON.stringify({ push_enabled: true }),
                });
              }, "Push preference saved. Delivery requires a running worker.")
            }
          >
            Enable push notifications
          </Button>
          <Button onPress={() => router.push("/safety")}>Safety Center</Button>
          <Text style={s.muted}>
            Native paid subscriptions are unavailable until Apple and Google
            billing are integrated. Your verified web entitlement is recognized
            by the API.
          </Text>
          <Button
            disabled={busy}
            onPress={() =>
              run(async () => {
                const { error } = await auth!.auth.signOut();
                if (error) throw error;
                qc.clear();
                router.replace("/auth");
              }, "Signed out.")
            }
          >
            Sign out
          </Button>
          <Text style={s.label}>Request deletion</Text>
          <Text style={s.muted}>
            The profile is hidden immediately. Cross-service erasure awaits
            retention-aware processing.
          </Text>
          <TextInput
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder="Type DELETE"
            accessibilityLabel="Type DELETE to request account deletion"
            style={s.input}
          />
          <Button
            disabled={busy || confirmation !== "DELETE"}
            onPress={() =>
              run(async () => {
                await api("account/deletion", {
                  method: "POST",
                  body: JSON.stringify({ confirmation }),
                });
                await auth!.auth.signOut();
                qc.clear();
                router.replace("/auth");
              }, "Deletion requested.")
            }
          >
            Request account deletion
          </Button>
        </>
      )}
      {message && <Text style={s.muted}>{message}</Text>}
      {error && (
        <Text accessibilityLiveRegion="polite" style={s.error}>
          {error}
        </Text>
      )}
    </Screen>
  );
}
