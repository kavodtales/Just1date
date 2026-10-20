import { View, StyleSheet } from "react-native";
export function PermissionArt({ friends = false }: { friends?: boolean }) {
  return (
    <View
      accessible={false}
      style={[
        s.art,
        { marginTop: friends ? 100 : 125, height: friends ? 215 : 190 },
      ]}
    >
      {friends ? (
        <>
          <View style={[s.shape, s.backHead]} />
          <View style={[s.shape, s.backBody]} />
          <View style={[s.shape, s.frontHead]} />
          <View style={[s.shape, s.frontBody]} />
        </>
      ) : (
        <>
          <View style={[s.shape, s.backBubble]} />
          <View style={[s.shape, s.tail]} />
          <View style={[s.shape, s.frontBubble]}>
            <View style={s.line} />
            <View style={[s.line, { width: 70 }]} />
          </View>
        </>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  art: { width: 207, alignSelf: "center", marginBottom: 90 },
  shape: { position: "absolute" },
  backHead: {
    width: 110,
    height: 110,
    borderRadius: 60,
    backgroundColor: "#b047b6",
    right: 22,
    top: 7,
    boxShadow: "7px 1px 22px #b047b644",
  },
  frontHead: {
    width: 110,
    height: 110,
    borderRadius: 60,
    backgroundColor: "#ebc6e9",
    left: 25,
    top: 28,
    boxShadow: "inset -20px -2px 28px #a13aa999",
  },
  backBody: {
    width: 140,
    height: 62,
    borderRadius: "50%",
    backgroundColor: "#aa43b1",
    right: 12,
    bottom: 28,
    boxShadow: "inset 16px 4px 20px #ce8bd3",
  },
  frontBody: {
    width: 132,
    height: 60,
    borderRadius: "50%",
    backgroundColor: "#edcce8",
    left: 14,
    bottom: 8,
    boxShadow: "inset -20px -8px 28px #c469ba",
  },
  backBubble: {
    width: 160,
    height: 125,
    borderRadius: 22,
    right: 3,
    top: 10,
    backgroundColor: "#ff9b3d",
    boxShadow: "3px 0px 25px #ffae5877",
  },
  frontBubble: {
    width: 160,
    height: 125,
    borderRadius: 22,
    left: 12,
    top: 40,
    backgroundColor: "#ffd4af",
    paddingTop: 34,
    paddingLeft: 25,
    gap: 20,
    boxShadow: "inset -16px 3px 25px #ffaf6777",
  },
  line: {
    width: 100,
    height: 20,
    borderRadius: 14,
    backgroundColor: "#fff1d4",
  },
  tail: {
    left: 27,
    bottom: 12,
    width: 40,
    height: 50,
    backgroundColor: "#ffd4af",
    transform: [{ skewX: "-30deg" }],
  },
});
