import { useEffect, useState } from "react";
import { Text, TextInput, View, Pressable } from "react-native";
import { router } from "expo-router";
import { auth } from "../lib/auth";
import { Screen, Button, s, colors } from "../components/ui";
export default function Phone() {
  const [phone, setPhone] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [remaining, setRemaining] = useState(0),
    [resendAt, setResendAt] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!resendAt) return;
    const timer = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);
  async function submit(verify = false) {
    setBusy(true);
    setError("");
    try {
      if (!auth)
        throw new Error(
          "Phone sign-in is being prepared. Please try again later.",
        );
      if (!/^\+[1-9]\d{7,14}$/.test(phone))
        throw new Error(
          "Enter your phone number with its country code, for example +234.",
        );
      if (verify && !/^\d{6}$/.test(code))
        throw new Error("Enter all six digits.");
      const result = verify
        ? await auth.auth.verifyOtp({ phone, token: code, type: "sms" })
        : await auth.auth.signInWithOtp({
            phone,
            options: { shouldCreateUser: false },
          });
      if (result.error)
        throw new Error(
          verify
            ? "That code could not be verified. Check it or request a new code."
            : "We could not send a code. Check your registered phone number and try again.",
        );
      if (verify) router.replace("/(tabs)/discover");
      else {
        setSent(true);
        setCode("");
        setRemaining(60);
        setResendAt(Date.now() + 60000);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      title={
        sent
          ? `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`
          : "My mobile"
      }
    >
      {sent ? (
        <>
          <Text style={[s.muted, { textAlign: "center", fontSize: 18 }]}>
            Type the verification code{"\n"}we’ve sent you
          </Text>
          <TextInput
            accessibilityLabel="Verification code"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
            style={[
              s.input,
              {
                color: colors.pink,
                textAlign: "center",
                fontSize: 28,
                letterSpacing: 14,
                fontFamily: "PoppinsBold",
              },
            ]}
          />
          <Button
            disabled={busy || code.length !== 6}
            onPress={() => submit(true)}
          >
            {busy ? "Verifying…" : "Verify code"}
          </Button>
          <Pressable
            accessibilityRole="button"
            disabled={remaining > 0 || busy}
            onPress={() => submit()}
            style={s.link}
          >
            <Text
              style={{
                color: colors.pink,
                textAlign: "center",
                fontFamily: "PoppinsBold",
                opacity: remaining > 0 ? 0.5 : 1,
              }}
            >
              Send again
            </Text>
          </Pressable>
          <Button onPress={() => setSent(false)}>Change number</Button>
        </>
      ) : (
        <>
          <Text style={s.muted}>
            Please enter your registered phone number. We will send you a code
            to sign in.
          </Text>
          <View style={{ marginTop: 0 }}>
            <TextInput
              accessibilityLabel="Phone number with country code"
              autoComplete="tel"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              placeholder="+234"
              style={s.input}
            />
          </View>
          <View style={{ marginTop: 49 }}>
            <Button disabled={busy} onPress={() => submit()}>
              {busy ? "Sending…" : "Continue"}
            </Button>
          </View>
          <Pressable
            style={s.link}
            onPress={() => router.push("/auth?mode=register")}
          >
            <Text style={[s.muted, { color: colors.pink }]}>
              New here? Create your account with email.
            </Text>
          </Pressable>
        </>
      )}
      {error && (
        <Text style={s.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </Screen>
  );
}
