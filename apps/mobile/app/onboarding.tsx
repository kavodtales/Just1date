import { useState } from "react";
import { Text, TextInput, View, Pressable } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { profileSchema, preferencesSchema } from "@just1date/validation";
import { onboardingSteps } from "@just1date/config";
import * as ImagePicker from "expo-image-picker";
import { api } from "../lib/api";
import { Screen, Status, Button, s, colors } from "../components/ui";
import { BirthdayPicker } from "../components/birthday-picker";
type FormFields = { display_name: string; city: string; bio: string; profession: string; education: string; values: string; communication: string; question: string; answer: string };
export default function Onboarding() {
  const qc = useQueryClient(),
    q = useQuery({ queryKey: ["me"], queryFn: () => api("profiles/me") });
  return (
    <Screen title="Profile details">
      <Status pending={q.isPending} error={q.error} retry={() => q.refetch()} />
      {q.data && (
        <Editor
          key={q.data.user_id}
          own={q.data}
          done={() => qc.invalidateQueries({ queryKey: ["me"] })}
        />
      )}
    </Screen>
  );
}
function Editor({ own, done }: { own: any; done: () => unknown }) {
  const [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [gender, setGender] = useState(own.gender || "self_described"),
    [goal, setGoal] = useState(own.goal || "serious"),
    [interests, setInterests] = useState<string[]>(own.interests ?? []),
    [prefs, setPrefs] = useState(own.preferences),
    [lifestyle, setLifestyle] = useState<Record<string, string>>(
      own.lifestyle ?? {},
    );
  const catalogs = useQuery({
    queryKey: ["interests"],
    queryFn: () => api<any[]>("catalog/interests"),
  });
  const { control, getValues } = useForm<FormFields>({
    defaultValues: {
      display_name: own.display_name ?? "",
      city: own.city ?? "",
      bio: own.bio ?? "",
      profession: own.profession ?? "",
      education: own.education ?? "",
      values: own.values?.join(", ") ?? "",
      communication: own.communication ?? "",
      question: own.prompts?.[0]?.question ?? "",
      answer: own.prompts?.[0]?.answer ?? "",
    },
  });
  const field = (
    name: keyof FormFields,
    label: string,
    multiline = false,
  ) => (
    <Controller
      key={name}
      name={name}
      control={control}
      render={({ field: { value, onChange } }) => (
        <View>
          <Text style={s.label}>{label}</Text>
          <TextInput
            value={value}
            onChangeText={onChange}
            multiline={multiline}
            maxLength={multiline ? 1000 : 150}
            style={s.input}
            accessibilityLabel={label}
          />
        </View>
      )}
    />
  );
  // Keep form-only prompt fields out of the strict wire schema.
  function profile() {
    const { question, answer, ...values } = getValues();
    return profileSchema.parse({
      ...values,
      gender,
      goal,
      interests,
      values: values.values
        .split(",")
        .map((v: string) => v.trim())
        .filter(Boolean),
      lifestyle,
      personality: own.personality ?? [],
      prompts:
        question || answer
          ? [{ question, answer }, ...(own.prompts ?? []).slice(1)]
          : [],
    });
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const details = profile();
      const preferences = preferencesSchema.parse({
        age_min: Number(prefs.age_min),
        age_max: Number(prefs.age_max),
        distance_km: Number(prefs.distance_km),
        genders: prefs.genders,
        goals: prefs.goals,
        deal_breakers: prefs.deal_breakers ?? {},
      });
      await api("profiles/me", { method: "PATCH", body: JSON.stringify(details) });
      await api("profiles/me/preferences", {
        method: "PATCH",
        body: JSON.stringify(preferences),
      });
      setMessage(
        "Profile saved. Confirm your email and get a photo approved to enter discovery.",
      );
      done();
    } catch (e) {
      setError(
        (e as Error).name === "ZodError"
          ? "Check your name, city, about text, interests and preferences before saving."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function photo() {
    setBusy(true);
    setError("");
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted)
        throw new Error(
          "Photo access was declined. You can enable it in device settings.",
        );
      const selected = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsEditing: true,
      });
      if (selected.canceled) return;
      await api("profiles/me", {
        method: "PATCH",
        body: JSON.stringify(profile()),
      });
      const position = [0, 1, 2, 3, 4, 5].find(
        (v) => !(own.photo_review ?? []).some((p: any) => p.position === v),
      );
      if (position === undefined)
        throw new Error(
          "All six photo slots are occupied. Photo replacement is not available yet.",
        );
      const file = selected.assets[0],
        blob = await (await fetch(file.uri)).blob();
      await api(`profiles/me/photos?position=${position}`, {
        method: "POST",
        headers: { "Content-Type": file.mimeType ?? "image/jpeg" },
        body: blob,
      });
      setMessage("Photo uploaded for moderation.");
      done();
    } catch (e) {
      setError(
        (e as Error).name === "ZodError"
          ? "Complete the earlier profile steps before uploading."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  const option = (
    value: string,
    label: string,
    current: string,
    onSelect: (v: string) => void,
  ) => (
    <Pressable
      key={value}
      accessibilityRole="button"
      accessibilityState={{ selected: current === value }}
      onPress={() => onSelect(value)}
      style={[
        s.input,
        {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: current === value ? colors.pink : "white",
          borderColor: current === value ? colors.pink : colors.line,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: current === value ? "PoppinsBold" : "Poppins",
          fontSize: 14,
          color: current === value ? "white" : "black",
        }}
      >
        {label}
      </Text>
      <Ionicons
        name="checkmark"
        size={20}
        color={current === value ? "white" : "#aaa8b5"}
      />
    </Pressable>
  );
  function next() {
    setError("");
    const v = getValues();
    if (step === 1 && v.display_name.trim().length < 2) {
      setError("Enter a name with at least two characters.");
      return;
    }
    if (step === 4 && !prefs.genders.length) {
      setError("Choose at least one preference.");
      return;
    }
    if (step === 6 && v.city.trim().length < 2) {
      setError("Enter your city.");
      return;
    }
    if (step === 7 && interests.length < 3) {
      setError("Choose at least three interests.");
      return;
    }
    if (
      step === 10 &&
      (v.bio.trim().length < 20 ||
        ((v.question || v.answer) &&
          (v.question.trim().length < 5 || v.answer.trim().length < 5)))
    ) {
      setError(
        "Add at least 20 characters about yourself. Prompt questions and answers need at least five characters.",
      );
      return;
    }
    setStep((v) => v + 1);
  }
  return (
    <View style={{ gap: 15 }}>
      <View style={s.row}>
        <Text style={[s.muted, { fontSize: 11 }]}>STEP {step + 1} OF 15</Text>
        <Text style={[s.muted, { fontSize: 11 }]}>
          {own.completion}% complete
        </Text>
      </View>
      <View style={{ height: 3, backgroundColor: colors.line }}>
        <View
          style={{
            height: 3,
            width: `${((step + 1) / 15) * 100}%`,
            backgroundColor: colors.pink,
          }}
        />
      </View>
      <Text style={[s.title, { marginTop: 15, marginBottom: 25 }]}>
        {step === 3
          ? "I am a"
          : step === 7
            ? "Your interests"
            : onboardingSteps[step]}
      </Text>
      {step === 0 && (
        <Text style={s.muted}>
          Your intentions, interests and everyday life help us introduce people
          worth getting to know.
        </Text>
      )}
      {step === 1 && field("display_name", "Name")}
      {step === 2 && <BirthdayPicker value={own.date_of_birth} readOnly />}
      {step === 3 &&
        [
          ["woman", "Woman"],
          ["man", "Man"],
          ["nonbinary", "Nonbinary"],
          ["self_described", "Choose another"],
        ].map(([value, label]) => option(value, label, gender, setGender))}
      {step === 4 &&
        ["woman", "man", "nonbinary", "self_described"].map((g) => (
          <Pressable
            key={g}
            style={s.input}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: prefs.genders.includes(g) }}
            onPress={() =>
              setPrefs({
                ...prefs,
                genders: prefs.genders.includes(g)
                  ? prefs.genders.filter((x: string) => x !== g)
                  : [...prefs.genders, g],
              })
            }
          >
            <Text style={s.muted}>
              {prefs.genders.includes(g) ? "✓ " : "+ "}
              {g.replace("_", " ")}
            </Text>
          </Pressable>
        ))}
      {step === 5 &&
        [
          ["serious", "Serious relationship"],
          ["marriage", "Marriage"],
          ["long_term", "Long-term dating"],
          ["dating", "Dating"],
          ["friendship", "Friendship"],
          ["exploring", "Still figuring it out"],
        ].map(([value, label]) => option(value, label, goal, setGoal))}
      {step === 6 && (
        <>
          {field("city", "Location")}
          <Text style={s.muted}>
            Your home address is never requested or shown.
          </Text>
        </>
      )}
      {step === 7 && (
        <>
          <Text style={s.muted}>
            Select a few of your interests and let everyone know what you’re
            passionate about.
          </Text>
          {catalogs.isPending && (
            <Text style={s.muted}>Loading interests…</Text>
          )}
          {catalogs.error && (
            <Text style={s.error}>{catalogs.error.message}</Text>
          )}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {catalogs.data?.map((i) => (
              <Pressable
                key={i.code}
                accessibilityRole="button"
                accessibilityState={{ selected: interests.includes(i.code) }}
                onPress={() =>
                  setInterests((v) =>
                    v.includes(i.code)
                      ? v.filter((x) => x !== i.code)
                      : [...v, i.code],
                  )
                }
                style={{
                  width: "48%",
                  minHeight: 45,
                  borderRadius: 15,
                  borderWidth: 1,
                  borderColor: interests.includes(i.code)
                    ? colors.pink
                    : colors.line,
                  padding: 12,
                  backgroundColor: interests.includes(i.code)
                    ? colors.pink
                    : "white",
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="heart-outline"
                  size={19}
                  color={interests.includes(i.code) ? "white" : colors.pink}
                />
                <Text
                  style={{
                    flex: 1,
                    fontFamily: interests.includes(i.code)
                      ? "PoppinsBold"
                      : "Poppins",
                    fontSize: 13,
                    color: interests.includes(i.code) ? "white" : "black",
                  }}
                >
                  {i.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      {step === 8 && (
        <>
          {[
            "smoking",
            "drinking",
            "exercise",
            "children",
            "pets",
            "social",
          ].map((k) => (
            <View key={k}>
              <Text style={s.label}>{k}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {["", "yes", "no", "sometimes"].map((value) => (
                  <Pressable
                    key={value}
                    style={[
                      s.input,
                      {
                        padding: 10,
                        minHeight: 44,
                        backgroundColor:
                          lifestyle[k] === value ? colors.soft : "white",
                      },
                    ]}
                    onPress={() => setLifestyle({ ...lifestyle, [k]: value })}
                    accessibilityState={{ selected: lifestyle[k] === value }}
                  >
                    <Text
                      style={{
                        fontFamily: "Poppins",
                        fontSize: 11,
                        color: lifestyle[k] === value ? colors.pink : "black",
                      }}
                    >
                      {value || "Prefer not to share"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
          {field("values", "Values (comma separated)")}
        </>
      )}
      {step === 9 && (
        <>
          {field("profession", "Profession")}
          {field("education", "Education")}
        </>
      )}
      {step === 10 && (
        <>
          {field("bio", "About me", true)}
          {field("question", "Profile prompt")}
          {field("answer", "Your answer", true)}
          {field("communication", "Communication preference")}
        </>
      )}
      {step === 11 && (
        <>
          <Text style={s.muted}>
            Use a clear photo of yourself. Photos are reviewed before other
            members can see them.
          </Text>
          <Button disabled={busy} onPress={photo}>
            Add a profile photo
          </Button>
          {own.photo_review?.map((p: any) => (
            <Text key={p.id} style={s.muted}>
              Photo {p.position + 1}: {p.status}
            </Text>
          ))}
        </>
      )}
      {step === 12 && (
        <>
          {["age_min", "age_max", "distance_km"].map((k) => (
            <View key={k}>
              <Text style={s.label}>
                {k === "age_min"
                  ? "Minimum age"
                  : k === "age_max"
                    ? "Maximum age"
                    : "Distance (km)"}
              </Text>
              <TextInput
                style={s.input}
                keyboardType="number-pad"
                accessibilityLabel={k}
                value={String(prefs[k])}
                onChangeText={(v) => setPrefs({ ...prefs, [k]: v })}
              />
            </View>
          ))}
        </>
      )}
      {step === 13 && (
        <Text style={s.muted}>
          Confirm your email using the verification link. Profile photos are
          reviewed separately. Selfie verification is not enabled yet.
        </Text>
      )}
      {step === 14 && (
        <>
          <Text style={s.muted}>
            Save your profile to continue. Discovery opens after email
            confirmation and approval of a profile photo.
          </Text>
          <Button disabled={busy} onPress={save}>
            {busy ? "Saving…" : "Confirm"}
          </Button>
          {message && (
            <Button onPress={() => router.replace("/enable-notifications")}>
              Continue
            </Button>
          )}
        </>
      )}
      {error && (
        <Text style={s.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      {message && <Text style={s.muted}>{message}</Text>}
      <View style={{ marginTop: 40, gap: 15 }}>
        {step < 14 && (
          <Button disabled={busy} onPress={next}>
            Continue
          </Button>
        )}
        {step > 0 && (
          <Pressable
            accessibilityRole="button"
            style={s.link}
            onPress={() => {
              setStep((v) => v - 1);
              setError("");
            }}
          >
            <Text
              style={{
                color: colors.pink,
                textAlign: "center",
                fontFamily: "PoppinsBold",
              }}
            >
              Back
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
