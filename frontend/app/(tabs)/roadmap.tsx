import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/src/api";
import { usePalette, spacing, radius, gradients } from "@/src/theme";

export default function Roadmap() {
  const { c, mode } = usePalette();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [regen, setRegen] = useState(false);

  const load = async () => {
    try {
      const r = await api.roadmap();
      setData(r.roadmap);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };
  useEffect(() => { load(); }, []);

  const regenerate = async () => {
    setRegen(true);
    try { const r = await api.regenRoadmap(); setData(r.roadmap); } catch {}
    setRegen(false);
  };

  if (loading) return <View style={[styles.center, { backgroundColor: c.surface }]}><ActivityIndicator color={c.brandPrimary} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.onSurface }]}>Your Roadmap</Text>
          <Pressable onPress={regenerate} disabled={regen} testID="regen-roadmap"
            style={[styles.regenBtn, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
            {regen ? <ActivityIndicator size="small" color={c.brandPrimary} /> :
              <Ionicons name="refresh" size={16} color={c.brandPrimary} />}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.brandPrimary} />}
          testID="roadmap-scroll"
        >
          {/* Long-term vision */}
          {data?.long_term && (
            <LinearGradient
              colors={mode === "dark" ? ["#312E81", "#7C3AED"] : ["#A78BFA", "#7C3AED"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.visionCard}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="star" size={16} color="#fff" />
                <Text style={styles.visionLabel}>12-Month Vision</Text>
              </View>
              <Text style={styles.visionTitle}>{data.long_term.title}</Text>
              <Text style={styles.visionSummary}>{data.long_term.summary}</Text>
            </LinearGradient>
          )}

          {/* Weekly */}
          {data?.weekly && (
            <View style={[styles.section, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
              <View style={styles.sectHead}>
                <Ionicons name="calendar" size={16} color={c.brandPrimary} />
                <Text style={[styles.sectTitle, { color: c.onSurface }]}>This Week</Text>
              </View>
              <Text style={[styles.sectFocus, { color: c.brandPrimary }]}>{data.weekly.focus}</Text>
              {data.weekly.milestones?.map((m: string, i: number) => (
                <View key={i} style={styles.milestone}>
                  <View style={[styles.milestoneDot, { backgroundColor: c.brandPrimary }]} />
                  <Text style={[styles.milestoneText, { color: c.onSurface }]}>{m}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Monthly timeline */}
          {data?.monthly && data.monthly.length > 0 && (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={[styles.sectionHeader, { color: c.onSurface }]}>Monthly Journey</Text>
              {data.monthly.map((m: any, i: number) => (
                <View key={i} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <LinearGradient colors={gradients.brand} style={styles.timelineNode}>
                      <Text style={styles.timelineNodeText}>{m.month}</Text>
                    </LinearGradient>
                    {i < data.monthly.length - 1 && <View style={[styles.timelineLine, { backgroundColor: c.border }]} />}
                  </View>
                  <View style={[styles.timelineCard, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
                    <Text style={[styles.timelineFocus, { color: c.brandPrimary }]}>Month {m.month}</Text>
                    <Text style={[styles.timelineTitle, { color: c.onSurface }]}>{m.focus}</Text>
                    {m.goals?.map((g: string, j: number) => (
                      <View key={j} style={styles.goalRow}>
                        <Ionicons name="checkmark-circle-outline" size={14} color={c.onSurfaceSecondary} />
                        <Text style={[styles.goalText, { color: c.onSurfaceSecondary }]}>{g}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Daily missions */}
          {data?.daily_missions && (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={[styles.sectionHeader, { color: c.onSurface }]}>Today's Blueprint</Text>
              {data.daily_missions.map((m: any) => (
                <View key={m.id} style={[styles.dailyCard, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
                  <View style={[styles.dailyTime, { backgroundColor: c.brandTertiary }]}>
                    <Text style={[styles.dailyTimeText, { color: c.onBrandTertiary }]}>{m.time_of_day}</Text>
                  </View>
                  <Text style={[styles.dailyTitle, { color: c.onSurface }]}>{m.title}</Text>
                  <Text style={[styles.dailyMeta, { color: c.onSurfaceTertiary }]}>{m.category} • {m.duration_min}m • +{m.xp} XP</Text>
                </View>
              ))}
            </View>
          )}

          {!data && (
            <View style={{ alignItems: "center", padding: 40 }}>
              <Ionicons name="map-outline" size={48} color={c.onSurfaceTertiary} />
              <Text style={{ color: c.onSurfaceSecondary, marginTop: 12 }}>No roadmap yet. Complete onboarding first.</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  regenBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  visionCard: { padding: spacing.lg, borderRadius: radius.lg, gap: 8, marginBottom: spacing.lg },
  visionLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  visionTitle: { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  visionSummary: { color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 20 },
  section: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1 },
  sectHead: { flexDirection: "row", gap: 8, alignItems: "center" },
  sectTitle: { fontSize: 16, fontWeight: "700" },
  sectFocus: { fontSize: 14, fontWeight: "600", marginTop: 6, marginBottom: 10 },
  milestone: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 8 },
  milestoneDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  milestoneText: { flex: 1, fontSize: 14, lineHeight: 20 },
  sectionHeader: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3, marginBottom: spacing.md },
  timelineRow: { flexDirection: "row", gap: 12, marginBottom: spacing.md },
  timelineLeft: { alignItems: "center", width: 40 },
  timelineNode: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  timelineNodeText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  timelineLine: { width: 2, flex: 1, marginTop: 4 },
  timelineCard: { flex: 1, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  timelineFocus: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  timelineTitle: { fontSize: 15, fontWeight: "700", marginTop: 2, marginBottom: 8 },
  goalRow: { flexDirection: "row", gap: 6, alignItems: "flex-start", marginTop: 4 },
  goalText: { flex: 1, fontSize: 13, lineHeight: 18 },
  dailyCard: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: 10 },
  dailyTime: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginBottom: 8 },
  dailyTimeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  dailyTitle: { fontSize: 14, fontWeight: "700" },
  dailyMeta: { fontSize: 12, marginTop: 4 },
});
