import { useEffect, useState } from "react";
import {
  Text,
  TextInput,
  View,
  Pressable,
  ScrollView,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { auth } from "../lib/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, s, colors } from "../components/ui";
export default function Phone() {
  const [country, setCountry] = useState("234"),
    [chooseCountry, setChooseCountry] = useState(false);
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
      const fullPhone = phone.startsWith("+")
        ? phone
        : `+${country}${phone.replace(/^0/, "")}`;
      if (!phone || !/^\+[1-9]\d{7,14}$/.test(fullPhone))
        throw new Error(
          "Enter your phone number with its country code, for example +234.",
        );
      if (verify && !/^\d{6}$/.test(code))
        throw new Error("Enter all six digits.");
      const result = verify
        ? await auth.auth.verifyOtp({
            phone: fullPhone,
            token: code,
            type: "sms",
          })
        : await auth.auth.signInWithOtp({
            phone: fullPhone,
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
  const countries = [
    ["234", "🇳🇬", "Nigeria"],
    ["1", "🇺🇸", "United States"],
    ["44", "🇬🇧", "United Kingdom"],
    ["233", "🇬🇭", "Ghana"],
    ["27", "🇿🇦", "South Africa"],
    ["254", "🇰🇪", "Kenya"],
  ];
  return (
    <SafeAreaView style={s.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 40,
          paddingTop: 20,
          paddingBottom: 48,
          maxWidth: 500,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <Pressable
          style={s.square}
          accessibilityRole="button"
          accessibilityLabel={sent ? "Change phone number" : "Back"}
          onPress={() =>
            sent
              ? setSent(false)
              : router.canGoBack()
                ? router.back()
                : router.replace("/signup")
          }
        >
          <Ionicons name="chevron-back" color={colors.pink} size={23} />
        </Pressable>
        <Text
          accessibilityRole="header"
          style={[
            s.title,
            {
              marginTop: 38,
              textAlign: sent ? "center" : "left",
              marginBottom: 6,
            },
          ]}
        >
          {sent
            ? String(Math.floor(remaining / 60)).padStart(2, "0") +
              ":" +
              String(remaining % 60).padStart(2, "0")
            : "My mobile"}
        </Text>
        {sent ? (
          <>
            <Text
              style={[
                s.muted,
                {
                  textAlign: "center",
                  fontSize: 18,
                  lineHeight: 27,
                  marginTop: 8,
                },
              ]}
            >
              Type the verification code{"\n"}we’ve sent you
            </Text>
            <View style={{ position: "relative", marginTop: 24 }}>
              <TextInput
                accessibilityLabel="Verification code"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={(value) => setCode(value.replace(/\D/g, ""))}
                style={{
                  position: "absolute",
                  opacity: 0,
                  width: 1,
                  height: 1,
                }}
                showSoftInputOnFocus={false}
              />
              <View
                style={{ flexDirection: "row", gap: 8 }}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {Array.from({ length: 6 }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 70,
                      borderRadius: 15,
                      borderWidth: 1,
                      borderColor:
                        code[i] || i === code.length
                          ? colors.pink
                          : colors.line,
                      backgroundColor: code[i] ? colors.pink : "white",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 28,
                        fontFamily: "PoppinsBold",
                        color: code[i]
                          ? "white"
                          : i === code.length
                            ? "#f2acd4"
                            : colors.line,
                      }}
                    >
                      {code[i] ?? "0"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 55 }}
            >
              {[
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9",
                "",
                "0",
                "delete",
              ].map((digit, i) =>
                digit ? (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    accessibilityLabel={
                      digit === "delete" ? "Delete last digit" : digit
                    }
                    disabled={busy}
                    onPress={() =>
                      setCode((value) =>
                        digit === "delete"
                          ? value.slice(0, -1)
                          : (value + digit).slice(0, 6),
                      )
                    }
                    style={{
                      width: "33.333%",
                      height: 60,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {digit === "delete" ? (
                      <Ionicons name="backspace-outline" size={25} />
                    ) : (
                      <Text style={{ fontSize: 24, fontFamily: "Poppins" }}>
                        {digit}
                      </Text>
                    )}
                  </Pressable>
                ) : (
                  <View key={i} style={{ width: "33.333%", height: 60 }} />
                ),
              )}
            </View>
            <View style={{ marginTop: 20 }}>
              <Button
                disabled={busy || code.length !== 6}
                onPress={() => submit(true)}
              >
                {busy ? "Verifying…" : "Verify code"}
              </Button>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={remaining > 0 || busy}
              onPress={() => submit()}
              style={[s.link, { marginTop: 16 }]}
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
          </>
        ) : (
          <>
            <Text style={s.muted}>
              Please enter your registered phone number. We will send you a code
              to sign in.
            </Text>
            <View
              style={[
                s.input,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 0,
                  gap: 14,
                },
              ]}
            >
              <Pressable
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  minHeight: 56,
                }}
                accessibilityRole="button"
                accessibilityLabel="Choose country code"
                onPress={() => setChooseCountry(true)}
              >
                <Text style={{ fontFamily: "Poppins", fontSize: 14 }}>
                  {countries.find((c) => c[0] === country)?.[1]} {country}
                </Text>
                <Ionicons name="chevron-down" size={13} color="#aaa8b5" />
              </Pressable>
              <View
                style={{ width: 1, height: 20, backgroundColor: colors.line }}
              />
              <TextInput
                accessibilityLabel="Phone number"
                autoComplete="tel"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(value) => setPhone(value.replace(/[^\d+]/g, ""))}
                placeholder="Phone number"
                maxLength={16}
                style={{
                  flex: 1,
                  minHeight: 56,
                  fontSize: 14,
                  fontFamily: "Poppins",
                  color: colors.ink,
                }}
              />
            </View>
            <View style={{ marginTop: 64 }}>
              <Button disabled={busy} onPress={() => submit()}>
                {busy ? "Sending…" : "Continue"}
              </Button>
            </View>
            <Pressable
              style={[s.link, { marginTop: 16 }]}
              onPress={() => router.push("/auth?mode=register")}
            >
              <Text
                style={[
                  s.muted,
                  { color: colors.pink, textAlign: "center", fontSize: 12 },
                ]}
              >
                New here? Create your account with email.
              </Text>
            </Pressable>
          </>
        )}
        {error && (
          <Text
            style={[s.error, { marginTop: 15 }]}
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        )}
      </ScrollView>
      <Modal
        visible={chooseCountry}
        transparent
        animationType="slide"
        onRequestClose={() => setChooseCountry(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#0008",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            style={{ flex: 1 }}
            accessibilityRole="button"
            accessibilityLabel="Close country codes"
            onPress={() => setChooseCountry(false)}
          />
          <View
            style={{
              padding: 40,
              gap: 10,
              backgroundColor: "white",
              borderTopLeftRadius: 40,
              borderTopRightRadius: 40,
            }}
          >
            <Text style={s.h2}>Country code</Text>
            {countries.map(([value, flag, label]) => (
              <Pressable
                key={value}
                style={s.input}
                accessibilityRole="button"
                accessibilityLabel={label + " +" + value}
                onPress={() => {
                  setCountry(value);
                  setChooseCountry(false);
                }}
              >
                <Text style={{ fontFamily: "Poppins" }}>
                  {flag} {label} +{value}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
