import { useState } from "react";
import { Text, TextInput, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { isAdult, registerSchema } from "@just1date/validation";
import { auth } from "../lib/auth";
import { Screen, Button, s } from "../components/ui";
import { BirthdayPicker } from "../components/birthday-picker";
export default function Auth() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<"login" | "register" | "recovery">(
      params.mode === "register" ? "register" : "login",
    ),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: { email: "", password: "", date_of_birth: "" },
  });
  return (
    <Screen
      title={
        mode === "register"
          ? "Let’s begin."
          : mode === "recovery"
            ? "Find your way back."
            : "Welcome back."
      }
    >
      {[
        "email",
        ...(mode !== "recovery" ? ["password"] : []),
        ...(mode === "register" ? ["date_of_birth"] : []),
      ].map((name) => (
        <Controller
          key={name}
          control={control}
          name={name as any}
          render={({ field: { value, onChange } }) => (
            <>
              <Text style={s.label}>{name.replaceAll("_", " ")}</Text>
              {name === "date_of_birth" ? (
                <BirthdayPicker value={value} onChange={onChange} />
              ) : (
                <TextInput
                  style={s.input}
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry={name === "password"}
                  autoCapitalize="none"
                  keyboardType={name === "email" ? "email-address" : "default"}
                  placeholder={
                    name === "date_of_birth" ? "YYYY-MM-DD" : undefined
                  }
                  accessibilityLabel={name.replaceAll("_", " ")}
                />
              )}
            </>
          )}
        />
      ))}
      {error && (
        <Text accessibilityLiveRegion="polite" style={s.error}>
          {error}
        </Text>
      )}
      {message && <Text style={s.muted}>{message}</Text>}
      <Button
        disabled={isSubmitting}
        onPress={handleSubmit(async (p) => {
          setError("");
          try {
            if (!auth) throw new Error("Supabase is not configured yet.");
            if (mode === "recovery") {
              await auth.auth.resetPasswordForEmail(p.email, {
                redirectTo: "just1date://auth/callback?next=/auth/reset",
              });
              setMessage(
                "If the account exists, check your email for a recovery link.",
              );
              return;
            }
            const result =
              mode === "register"
                ? await (async () => {
                    registerSchema.parse(p);
                    if (!isAdult(p.date_of_birth))
                      throw new Error("You must be at least 18.");
                    return auth.auth.signUp({
                      email: p.email,
                      password: p.password,
                      options: {
                        data: { date_of_birth: p.date_of_birth },
                        emailRedirectTo: "just1date://auth/callback",
                      },
                    });
                  })()
                : await auth.auth.signInWithPassword({
                    email: p.email,
                    password: p.password,
                  });
            if (result.error)
              throw new Error(
                mode === "login"
                  ? "Check your credentials and verify your email."
                  : "The account could not be created. Check your details.",
              );
            if (result.data.session) router.replace("/(tabs)/discover");
            else setMessage("Check your email to confirm your account.");
          } catch (e) {
            setError((e as Error).message);
          }
        })}
      >
        {isSubmitting
          ? "Please wait…"
          : mode === "register"
            ? "Create account"
            : mode === "recovery"
              ? "Send recovery link"
              : "Sign in"}
      </Button>
      {(["login", "register", "recovery"] as const)
        .filter((x) => x !== mode)
        .map((x) => (
          <Pressable
            key={x}
            onPress={() => {
              setMode(x);
              setError("");
              setMessage("");
            }}
            style={s.link}
          >
            <Text>
              {x === "login"
                ? "Sign in"
                : x === "register"
                  ? "Create an account"
                  : "Forgot password?"}
            </Text>
          </Pressable>
        ))}
    </Screen>
  );
}
