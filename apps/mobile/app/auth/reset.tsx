import { useState } from "react";
import { Text, TextInput } from "react-native";
import { router } from "expo-router";
import { auth } from "../../lib/auth";
import { Screen, Button, s } from "../../components/ui";
export default function Reset() {
  const [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Screen title="A fresh start.">
      <Text style={s.label}>Choose a new password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        accessibilityLabel="New password"
        style={s.input}
      />
      <Button
        disabled={password.length < 12 || busy}
        onPress={async () => {
          setBusy(true);
          try {
            if (!auth) throw new Error("Supabase is not configured.");
            const { data, error } = await auth.auth.getUser();
            if (error || !data.user)
              throw new Error("Open the recovery link from your email first.");
            const update = await auth.auth.updateUser({ password });
            if (update.error)
              throw new Error("The password could not be updated.");
            router.replace("/(tabs)/profile");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Update password
      </Button>
      {error && <Text style={s.error}>{error}</Text>}
    </Screen>
  );
}
