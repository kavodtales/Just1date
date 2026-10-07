import { useRef, useState } from "react";
import { Modal, Pressable, Text, View, ScrollView } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { preferencesSchema } from "@just1date/validation";
import { api } from "../lib/api";
import { Button, Status, s, colors } from "./ui";
function Slider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const rail = useRef<View>(null);
  const update = (pageX: number) =>
    rail.current?.measureInWindow((x, _y, width) =>
      onChange(
        Math.round(
          Math.max(
            min,
            Math.min(max, min + ((pageX - x) / width) * (max - min)),
          ),
        ),
      ),
    );
  return (
    <View
      ref={rail}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) =>
        onChange(
          Math.max(
            min,
            Math.min(
              max,
              value + (e.nativeEvent.actionName === "increment" ? 1 : -1),
            ),
          ),
        )
      }
      style={{ height: 44, justifyContent: "center", marginTop: 16 }}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => update(e.nativeEvent.pageX)}
      onResponderMove={(e) => update(e.nativeEvent.pageX)}
    >
      <View
        style={{ height: 6, backgroundColor: "#e8e6ea", borderRadius: 3 }}
      />
      <View
        style={{
          position: "absolute",
          height: 6,
          backgroundColor: colors.pink,
          width: `${((value - min) / (max - min)) * 100}%`,
          borderRadius: 3,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: `${((value - min) / (max - min)) * 100}%`,
          marginLeft: -18,
          width: 36,
          height: 36,
          backgroundColor: colors.pink,
          borderWidth: 3,
          borderColor: "white",
          borderRadius: 18,
          boxShadow: "0 2px 5px #df359420",
        }}
      />
    </View>
  );
}
export function Filters({ onClose }: { onClose: () => void }) {
  const q = useQuery({ queryKey: ["me"], queryFn: () => api("profiles/me") });
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "#0008",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          style={{ flex: 1 }}
          accessibilityLabel="Close filters"
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: "white",
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            maxHeight: "85%",
            padding: 40,
          }}
        >
          <View
            style={{
              height: 5,
              width: 26,
              borderRadius: 5,
              alignSelf: "center",
              backgroundColor: "#e4e2e6",
              marginTop: -25,
              marginBottom: 18,
            }}
          />
          <Text style={[s.h2, { textAlign: "center", marginBottom: 30 }]}>
            Filters
          </Text>
          <Status
            pending={q.isPending}
            error={q.error}
            retry={() => q.refetch()}
          />
          {q.data && <Editor own={q.data} onClose={onClose} />}
        </View>
      </View>
    </Modal>
  );
}
function Editor({ own, onClose }: { own: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [prefs, setPrefs] = useState(own.preferences),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Pressable
        accessibilityRole="button"
        style={{ alignSelf: "flex-end", minHeight: 44 }}
        onPress={() =>
          setPrefs({
            ...prefs,
            age_min: 18,
            age_max: 99,
            distance_km: 50,
            genders: ["woman", "man", "nonbinary", "self_described"],
            goals: [],
            deal_breakers: {},
          })
        }
      >
        <Text style={{ color: colors.pink, fontFamily: "PoppinsBold" }}>
          Clear
        </Text>
      </Pressable>
      <Text style={{ fontFamily: "PoppinsBold", marginBottom: 20 }}>
        Interested in
      </Text>
      <View
        style={{
          flexDirection: "row",
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 15,
          overflow: "hidden",
        }}
      >
        {[
          ["Girls", ["woman"]],
          ["Boys", ["man"]],
          ["Both", ["woman", "man"]],
        ].map(([label, genders]) => (
          <Pressable
            key={String(label)}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              minHeight: 58,
              backgroundColor:
                JSON.stringify(prefs.genders) === JSON.stringify(genders)
                  ? colors.pink
                  : "white",
            }}
            accessibilityState={{
              selected:
                JSON.stringify(prefs.genders) === JSON.stringify(genders),
            }}
            onPress={() => setPrefs({ ...prefs, genders })}
          >
            <Text
              style={{
                fontFamily: "Poppins",
                color:
                  JSON.stringify(prefs.genders) === JSON.stringify(genders)
                    ? "white"
                    : colors.ink,
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ marginTop: 20, gap: 6 }}>
        {["nonbinary", "self_described"].map((g) => (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: prefs.genders.includes(g) }}
            key={g}
            style={{ minHeight: 35 }}
            onPress={() =>
              setPrefs({
                ...prefs,
                genders: prefs.genders.includes(g)
                  ? prefs.genders.filter((v: string) => v !== g)
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
      </View>
      <Pressable
        style={[s.input, { marginTop: 22 }]}
        accessibilityLabel="Edit your location"
        onPress={() => {
          onClose();
          import("expo-router").then(({ router }) =>
            router.push("/onboarding"),
          );
        }}
      >
        <Text style={s.muted}>{own.city || "Add your city"} ›</Text>
      </Pressable>
      <View style={{ marginVertical: 30 }}>
        <View style={s.row}>
          <Text style={{ fontFamily: "PoppinsBold" }}>Distance</Text>
          <Text style={s.muted}>{prefs.distance_km}km</Text>
        </View>
        <Slider
          label="Distance in kilometres"
          min={1}
          max={500}
          value={prefs.distance_km}
          onChange={(distance_km) => setPrefs({ ...prefs, distance_km })}
        />
      </View>
      <View style={s.row}>
        <Text style={{ fontFamily: "PoppinsBold" }}>Age</Text>
        <Text style={s.muted}>
          {prefs.age_min}–{prefs.age_max}
        </Text>
      </View>
      <Slider
        label="Minimum age"
        min={18}
        max={99}
        value={prefs.age_min}
        onChange={(v) =>
          setPrefs({ ...prefs, age_min: Math.min(v, prefs.age_max) })
        }
      />
      <Slider
        label="Maximum age"
        min={18}
        max={99}
        value={prefs.age_max}
        onChange={(v) =>
          setPrefs({ ...prefs, age_max: Math.max(v, prefs.age_min) })
        }
      />
      {error && <Text style={s.error}>{error}</Text>}
      <View style={{ marginTop: 30 }}>
        <Button
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            setError("");
            try {
              const p = preferencesSchema.parse({
                age_min: prefs.age_min,
                age_max: prefs.age_max,
                distance_km: prefs.distance_km,
                genders: prefs.genders,
                goals: prefs.goals,
                deal_breakers: prefs.deal_breakers ?? {},
              });
              await api("profiles/me/preferences", {
                method: "PATCH",
                body: JSON.stringify(p),
              });
              await Promise.all([
                qc.invalidateQueries({ queryKey: ["discover"] }),
                qc.invalidateQueries({ queryKey: ["me"] }),
              ]);
              onClose();
            } catch (e) {
              setError(
                (e as Error).name === "ZodError"
                  ? "Choose a valid age range and preferences."
                  : (e as Error).message,
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : "Continue"}
        </Button>
      </View>
    </ScrollView>
  );
}
