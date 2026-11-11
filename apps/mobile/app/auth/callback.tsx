import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { auth } from "../../lib/auth";
import { Screen, Button, s } from "../../components/ui";
export default function Callback() {
  const { code, next } = useLocalSearchParams<{
    code: string;
    next?: string;
  }>();
  const [message, setMessage] = useState("Confirming your account…");
  useEffect(() => {
    if (!code) {
      setMessage("Open a valid confirmation link from your email.");
      return;
    }
    if (!auth) {
      setMessage(
        "Account services are not configured. Return to sign in and try again later.",
      );
      return;
    }
    let active = true;
    auth.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (!active) return;
        if (error)
          setMessage("This link is invalid or expired. Request a new one.");
        else
          router.replace(
            next === "/auth/reset" ? "/auth/reset" : "/onboarding",
          );
      })
      .catch(() => {
        if (active)
          setMessage(
            "Account services are temporarily unavailable. Please try the link again later.",
          );
      });
    return () => {
      active = false;
    };
  }, [code, next]);
  return (
    <Screen title="Your next chapter">
      <Text style={s.muted}>{message}</Text>
      <Button onPress={() => router.replace("/auth")}>Return to sign in</Button>
    </Screen>
  );
}
