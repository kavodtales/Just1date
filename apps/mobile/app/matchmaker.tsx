import { useState } from "react";
import { Text, TextInput, Switch } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { Compatibility } from "@just1date/types";
import { Screen, Status, Button, s, colors } from "../components/ui";
import { api } from "../lib/api";
export default function Matchmaker() {
  const { target } = useLocalSearchParams<{ target: string }>();
  const q = useQuery({
    queryKey: ["compatibility", target],
    queryFn: () => api<Compatibility>(`compatibility/${target}`),
    enabled: Boolean(target),
  });
  const [consent, setConsent] = useState(false),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Screen title="Compatibility">
      {target ? (
        <Status
          pending={q.isPending}
          error={q.error}
          retry={() => q.refetch()}
        />
      ) : (
        <Text style={s.muted}>
          Open a profile to explore your compatibility.
        </Text>
      )}
      {q.data && (
        <>
          <Text style={[s.h2, { color: colors.pink }]}>
            {q.data.overall_score === null
              ? "More profile information needed"
              : `${q.data.overall_score}% profile alignment`}
          </Text>
          <Text style={s.muted}>
            Based on your preferences and profile information.
          </Text>
          {q.data.positive_matches.map((f) => (
            <Text key={f} style={s.muted}>
              ✓ {f}
            </Text>
          ))}
          {q.data.potential_differences.map((f) => (
            <Text key={f} style={s.muted}>
              Potential difference: {f}
            </Text>
          ))}
          <Text style={s.muted}>
            Optional AI assistance sends your explicit interests, relationship
            goals and communication preferences to the configured provider.
            Review every suggestion before using it.
          </Text>
          <Switch
            accessibilityLabel="Allow AI assistance for this request"
            value={consent}
            onValueChange={setConsent}
            trackColor={{ true: colors.pink }}
          />
          <Button
            disabled={!consent || busy}
            onPress={async () => {
              setBusy(true);
              setError("");
              try {
                const r = await api<{ text: string }>("ai/suggestions", {
                  method: "POST",
                  body: JSON.stringify({
                    target_id: target,
                    kind: "icebreakers",
                  }),
                });
                setText(r.text);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Generating…" : "Suggest conversation starters"}
          </Button>
          {text && (
            <TextInput
              accessibilityLabel="Edit your AI suggestions"
              multiline
              value={text}
              onChangeText={setText}
              style={s.input}
            />
          )}
        </>
      )}
      {error && <Text style={s.error}>{error}</Text>}
    </Screen>
  );
}
