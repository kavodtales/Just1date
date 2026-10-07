import { Text, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { legalDocuments } from "@just1date/config";
import { Screen, s, colors } from "../../components/ui";
export default function Legal() {
  const { document } = useLocalSearchParams<{ document: string }>(),
    content = legalDocuments[document];
  return (
    <Screen title={content?.title ?? "Document unavailable"}>
      <Text
        style={{ color: colors.pink, fontFamily: "PoppinsBold", fontSize: 12 }}
      >
        LEGAL REVIEW REQUIRED — NOT FINAL LAUNCH DOCUMENTS
      </Text>
      {content?.paragraphs.map((p) => (
        <Text key={p} style={s.muted}>
          {p}
        </Text>
      ))}
      {Object.entries(legalDocuments).map(([key, value]) => (
        <Pressable
          key={key}
          style={s.link}
          onPress={() => router.replace(`/legal/${key}`)}
        >
          <Text style={{ fontFamily: "PoppinsSemiBold", color: colors.pink }}>
            {value.title.replace(" — draft", "")}
          </Text>
        </Pressable>
      ))}
    </Screen>
  );
}
