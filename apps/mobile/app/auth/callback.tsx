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
    auth?.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error)
        setMessage("This link is invalid or expired. Request a new one.");
      else
        router.replace(next === "/auth/reset" ? "/auth/reset" : "/onboarding");
    });
  }, [code, next]);
  return (
    <Screen title="Your next chapter">
      <Text style={s.muted}>{message}</Text>
      <Button onPress={() => router.replace("/auth")}>Return to sign in</Button>
    </Screen>
  );
}
