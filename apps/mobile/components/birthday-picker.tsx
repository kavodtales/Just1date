import { useState } from "react";
import { Modal, View, Text, Pressable, TextInput } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, s, colors } from "./ui";
export function BirthdayPicker({
  value,
  onChange,
  readOnly = false,
}: {
  value: string;
  onChange?: (date: string) => void;
  readOnly?: boolean;
}) {
  const initial = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(new Date().getFullYear() - 18, 0, 1);
  const [open, setOpen] = useState(false),
    [year, setYear] = useState(String(initial.getFullYear())),
    [month, setMonth] = useState(initial.getMonth()),
    [day, setDay] = useState(initial.getDate());
  const y = Math.max(
      1900,
      Math.min(new Date().getFullYear(), Number(year) || 1900),
    ),
    days = new Date(y, month + 1, 0).getDate();
  const move = (delta: number) => {
    const date = new Date(y, month + delta, 1);
    setYear(String(date.getFullYear()));
    setMonth(date.getMonth());
    setDay((d) =>
      Math.min(
        d,
        new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
      ),
    );
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        style={[
          s.button,
          { backgroundColor: colors.soft, flexDirection: "row", gap: 15 },
        ]}
        onPress={() => setOpen(true)}
      >
        <Ionicons name="calendar-outline" size={22} color={colors.pink} />
        <Text
          style={{
            color: colors.pink,
            fontFamily: "PoppinsBold",
            fontSize: 14,
          }}
        >
          {value || "Choose birthday date"}
        </Text>
      </Pressable>
      {open && (
        <Modal
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}
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
              accessibilityLabel="Close birthday picker"
              onPress={() => setOpen(false)}
            />
            <View
              style={{
                backgroundColor: "white",
                borderTopLeftRadius: 40,
                borderTopRightRadius: 40,
                padding: 40,
                paddingBottom: 48,
              }}
            >
              <View
                style={{
                  height: 5,
                  width: 26,
                  backgroundColor: colors.line,
                  alignSelf: "center",
                  borderRadius: 5,
                  marginTop: -25,
                  marginBottom: 45,
                }}
              />
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                Birthday
              </Text>
              <View style={[s.row, { marginBottom: 25 }]}>
                <Pressable
                  disabled={readOnly}
                  accessibilityLabel="Previous month"
                  style={s.link}
                  onPress={() => move(-1)}
                >
                  <Ionicons name="chevron-back" size={18} />
                </Pressable>
                <View style={{ alignItems: "center" }}>
                  <TextInput
                    accessibilityLabel="Birth year"
                    editable={!readOnly}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={year}
                    onChangeText={setYear}
                    style={{
                      color: colors.pink,
                      fontFamily: "PoppinsBold",
                      fontSize: 32,
                      textAlign: "center",
                      minWidth: 100,
                    }}
                  />
                  <Text style={{ color: colors.pink, fontFamily: "Poppins" }}>
                    {new Date(y, month).toLocaleDateString("en", {
                      month: "long",
                    })}
                  </Text>
                </View>
                <Pressable
                  disabled={readOnly}
                  accessibilityLabel="Next month"
                  style={s.link}
                  onPress={() => move(1)}
                >
                  <Ionicons name="chevron-forward" size={18} />
                </Pressable>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginBottom: 45,
                }}
              >
                {Array.from({ length: days }, (_, i) => (
                  <Pressable
                    key={i}
                    disabled={readOnly}
                    accessibilityRole="button"
                    accessibilityLabel={`Day ${i + 1}`}
                    accessibilityState={{ selected: day === i + 1 }}
                    onPress={() => setDay(i + 1)}
                    style={{
                      width: "14.285%",
                      height: 43,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 39,
                        height: 39,
                        borderRadius: 20,
                        backgroundColor: day === i + 1 ? colors.pink : "white",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 14,
                          color: day === i + 1 ? "white" : "black",
                        }}
                      >
                        {i + 1}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
              {readOnly && (
                <Text style={[s.muted, { fontSize: 11, marginBottom: 15 }]}>
                  Your date of birth is fixed at registration. Contact support
                  to request a correction.
                </Text>
              )}
              <Button
                onPress={() => {
                  onChange?.(
                    `${y}-${String(month + 1).padStart(2, "0")}-${String(Math.min(day, days)).padStart(2, "0")}`,
                  );
                  setOpen(false);
                }}
              >
                {readOnly ? "Done" : "Save"}
              </Button>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
