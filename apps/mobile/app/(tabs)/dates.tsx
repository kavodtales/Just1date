import { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, Linking } from "react-native";
import { PromotionalPhoto } from "../../components/promotional-photo";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { dateActivities } from "@just1date/config";
import type { DatePlan } from "@just1date/types";
import { api } from "../../lib/api";
import { Screen, Button, Status, colors, s } from "../../components/ui";
export default function Dates() {
  const params = useLocalSearchParams<{ match?: string }>(),
    qc = useQueryClient();
  const matches = useQuery({
    queryKey: ["matches"],
    queryFn: () => api<any[]>("matches"),
  });
  const plans = useQuery({
    queryKey: ["dates"],
    queryFn: () => api<DatePlan[]>("dates"),
    refetchInterval: 15000,
  });
  const [selected, setSelected] = useState(params.match ?? ""),
    [activity, setActivity] = useState<DatePlan["activity"]>("coffee"),
    [venue, setVenue] = useState(""),
    [day, setDay] = useState(""),
    [time, setTime] = useState(""),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const op = useRef<{ body: string; id: string } | null>(null);
  const match =
    (matches.data ?? []).find((m) => m.id === selected) ?? matches.data?.[0];
  async function propose() {
    if (!match || busy) return;
    setError("");
    setNotice("");
    const starts = new Date(`${day}T${time}:00`).getTime();
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
      !/^\d{2}:\d{2}$/.test(time) ||
      !Number.isFinite(starts) ||
      starts < Date.now() + 900000 ||
      starts > Date.now() + 90 * 86400000
    ) {
      setError(
        "Enter a date (YYYY-MM-DD) and local time (HH:mm), 15 minutes to 90 days ahead.",
      );
      return;
    }
    if (venue.trim().length < 3) {
      setError("Choose a public meeting place of at least 3 characters.");
      return;
    }
    const body = {
      match_id: match.id,
      activity,
      venue: venue.trim(),
      starts_at: new Date(starts).toISOString(),
      note: note.trim(),
    };
    if (!op.current || op.current.body !== JSON.stringify(body))
      op.current = { body: JSON.stringify(body), id: Crypto.randomUUID() };
    setBusy(true);
    try {
      await api("dates", {
        method: "POST",
        body: JSON.stringify({ ...body, operation_id: op.current.id }),
      });
      op.current = null;
      setVenue("");
      setNote("");
      setDay("");
      setTime("");
      setNotice("Invitation sent. Your match chooses whether to accept.");
      await qc.invalidateQueries({ queryKey: ["dates"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function respond(p: DatePlan, action: "accept" | "decline" | "cancel") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`dates/${p.id}/actions`, {
        method: "POST",
        body: JSON.stringify({ action, revision: p.revision }),
      });
      setNotice("Your date plan was updated.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      await qc.invalidateQueries({ queryKey: ["dates"] });
      setBusy(false);
    }
  }
  return (
    <Screen
      title="Just One Date"
      subtitle="A little invitation. A beautiful beginning."
    >
      <View
        style={{
          borderRadius: 24,
          overflow: "hidden",
          backgroundColor: colors.purple,
        }}
      >
        <PromotionalPhoto slot="date_venue" />
        <View style={{ padding: 20, gap: 8 }}>
          <Text
            style={{ fontFamily: "PoppinsBold", fontSize: 25, color: "white" }}
          >
            Give a spark somewhere to go.
          </Text>
          <Text
            style={{ fontFamily: "Poppins", fontSize: 12, color: "#ecd9e5" }}
          >
            Illustrative setting · No reservations are made.
          </Text>
        </View>
      </View>
      <Status
        pending={matches.isPending || plans.isPending}
        error={matches.error ?? plans.error}
        retry={() => {
          void matches.refetch();
          void plans.refetch();
        }}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={s.muted}>
          {notice}
        </Text>
      )}
      {matches.data?.length ? (
        <View style={s.card}>
          <Text style={s.h2}>Make the first move.</Text>
          <Text style={s.label}>YOUR CONNECTION</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {matches.data.map((m) => (
              <Pressable
                key={m.id}
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{ selected: m.id === match?.id }}
                onPress={() => setSelected(m.id)}
                style={{
                  padding: 12,
                  minHeight: 44,
                  borderRadius: 16,
                  backgroundColor: m.id === match?.id ? colors.soft : "#fff",
                  borderWidth: 1,
                  borderColor: colors.line,
                }}
              >
                <Text
                  style={{ color: colors.ink, fontFamily: "PoppinsSemiBold" }}
                >
                  {m.profile.display_name}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.label}>WHAT SOUNDS LIKE YOU?</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {dateActivities.map((a) => (
              <Pressable
                key={a.id}
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{ selected: activity === a.id }}
                onPress={() => setActivity(a.id)}
                style={{
                  padding: 12,
                  minHeight: 44,
                  borderRadius: 16,
                  backgroundColor:
                    activity === a.id ? colors.purple : colors.soft,
                }}
              >
                <Text
                  style={{
                    fontFamily: "PoppinsSemiBold",
                    color: activity === a.id ? "white" : colors.purple,
                  }}
                >
                  {a.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.label}>PUBLIC MEETING PLACE</Text>
          <TextInput
            editable={!busy}
            accessibilityLabel="Public meeting place"
            placeholder="A café or public place you both know"
            maxLength={160}
            style={s.input}
            value={venue}
            onChangeText={setVenue}
          />
          <Text style={s.label}>DATE · YYYY-MM-DD</Text>
          <TextInput
            editable={!busy}
            accessibilityLabel="Date in YYYY-MM-DD format"
            placeholder="YYYY-MM-DD"
            maxLength={10}
            style={s.input}
            value={day}
            onChangeText={setDay}
          />
          <Text style={s.label}>LOCAL TIME · HH:mm</Text>
          <TextInput
            editable={!busy}
            accessibilityLabel="Local time in 24 hour format"
            placeholder="18:30"
            maxLength={5}
            style={s.input}
            value={time}
            onChangeText={setTime}
          />
          <Text style={s.muted}>
            Uses your device timezone. Choose 15 minutes to 90 days ahead.
          </Text>
          <Text style={s.label}>A THOUGHTFUL NOTE · OPTIONAL</Text>
          <TextInput
            editable={!busy}
            multiline
            accessibilityLabel="A thoughtful note"
            placeholder="I thought you might enjoy…"
            maxLength={500}
            style={[s.input, { minHeight: 90 }]}
            value={note}
            onChangeText={setNote}
          />
          <Button disabled={busy} onPress={() => void propose()}>
            {busy ? "Saving…" : "Send date invitation"}
          </Button>
          <Text style={s.muted}>
            Both people choose whether to go. Just1Date does not book your
            venue.
          </Text>
        </View>
      ) : (
        !matches.isPending &&
        !matches.error && (
          <View style={s.card}>
            <Text style={s.h2}>A mutual spark comes first.</Text>
            <Text style={s.muted}>
              Match with someone before proposing a date.
            </Text>
            <Button onPress={() => router.push("/(tabs)/discover")}>
              Discover connections
            </Button>
            <Button
              onPress={() =>
                void Linking.openURL(
                  "https://just1date-vert.vercel.app/demo?view=dates",
                )
              }
            >
              Try the fictional web demo
            </Button>
          </View>
        )
      )}
      <Text style={s.h2}>Your date plans.</Text>
      {plans.data?.length === 0 && (
        <Text style={s.muted}>
          Your next good story starts with a simple invitation.
        </Text>
      )}
      {plans.data?.map((p) => (
        <View key={p.id} style={s.card}>
          <Text style={s.eyebrow}>
            {p.status === "proposed"
              ? "AWAITING REPLY"
              : p.status.toUpperCase()}
          </Text>
          <Text
            style={{
              fontFamily: "PoppinsBold",
              fontSize: 20,
              color: colors.purple,
            }}
          >
            {dateActivities.find((a) => a.id === p.activity)?.name} with{" "}
            {p.other_name}
          </Text>
          <Text style={s.muted}>{p.venue}</Text>
          <Text style={s.muted}>{new Date(p.starts_at).toLocaleString()}</Text>
          {!!p.note && <Text style={s.muted}>{p.note}</Text>}
          {new Date(p.starts_at).getTime() > Date.now() && (
            <>
              {p.status === "proposed" && !p.is_sender && (
                <>
                  <Button
                    disabled={busy}
                    onPress={() => void respond(p, "accept")}
                  >
                    Accept invitation
                  </Button>
                  <Button
                    disabled={busy}
                    onPress={() => void respond(p, "decline")}
                  >
                    Decline
                  </Button>
                </>
              )}
              {["proposed", "accepted"].includes(p.status) && (
                <Pressable
                  disabled={busy}
                  style={s.link}
                  onPress={() => void respond(p, "cancel")}
                  accessibilityRole="button"
                >
                  <Text style={{ color: colors.pink }}>Cancel plan</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      ))}
      <View style={s.card}>
        <Text style={{ fontFamily: "PoppinsBold", color: colors.purple }}>
          A good date feels safe.
        </Text>
        <Text style={s.muted}>
          Meet in public, arrange your own travel and tell someone you trust.
          You can change your mind at any time.
        </Text>
        <Button onPress={() => router.push("/safety")}>
          Open Safety Center
        </Button>
      </View>
    </Screen>
  );
}
