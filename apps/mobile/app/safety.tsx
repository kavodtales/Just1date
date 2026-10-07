import { useState } from "react";
import { Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { api } from "../lib/api";
import { Screen, Status, Button, s } from "../components/ui";
export default function Safety() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["safety"],
    queryFn: () => api<any[]>("safety/sessions"),
  });
  const [error, setError] = useState("");
  return (
    <Screen title="Connection, with care.">
      <View style={s.card}>
        <Text style={s.h2}>Your peace of mind matters.</Text>
        <Text>
          Meet in a public place. Arrange your own transport. Tell someone you
          trust. Never send money or banking details to a match.
        </Text>
        <Text style={s.muted}>
          Automated emergency alerts and live location sharing are not
          connected. Contact local emergency services or your trusted contact
          directly if in danger.
        </Text>
      </View>
      <Text style={s.label}>Your date sessions</Text>
      <Status
        pending={q.isPending}
        error={q.error}
        empty={
          q.data?.length === 0
            ? "Plan a date session from the web Safety Center."
            : undefined
        }
        retry={() => q.refetch()}
      />
      {q.data?.map((session) => (
        <View style={s.card} key={session.id}>
          <Text style={s.h2}>{session.person_name}</Text>
          <Text>
            {session.venue} · {session.status}
          </Text>
          <Text>{new Date(session.starts_at).toLocaleString()}</Text>
          {session.status !== "ended" &&
            ["check_in", "end"].map((action) => (
              <Button
                key={action}
                onPress={async () => {
                  try {
                    await api(`safety/sessions/${session.id}/${action}`, {
                      method: "POST",
                    });
                    qc.invalidateQueries({ queryKey: ["safety"] });
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                {action === "end" ? "End session" : "Check in"}
              </Button>
            ))}
        </View>
      ))}
      <Text style={s.muted}>
        To report or block, open the person’s profile and select the appropriate
        action.
      </Text>
      <Button onPress={() => router.back()}>Back</Button>
      {error && <Text style={s.error}>{error}</Text>}
    </Screen>
  );
}
