import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Rect, Line, Path } from "react-native-svg";
import { api } from "@/src/api";
import { usePalette, spacing, radius, gradients } from "@/src/theme";
import { ProgressBar } from "@/src/ui";

const BADGES: Record<string, { title: string; icon: any; colors: readonly [string, string] }> = {
  week_warrior: { title: "Week Warrior", icon: "flame", colors: ["#F59E0B", "#EF4444"] },
  monthly_master: { title: "Monthly Master", icon: "trophy", colors: ["#7C3AED", "#EC4899"] },
  "500_xp": { title: "500 XP Club", icon: "star", colors: ["#3B82F6", "#06B6D4"] },
  level_5: { title: "Level 5", icon: "medal", colors: ["#10B981", "#059669"] },
};

export default function Progress() {
  const { c, mode } = usePalette();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { const r = await api.weeklyReport(); setData(r); } catch {}
    setLoading(false); setRefreshing(false);
  };
  useEffect(() => { load(); }, []);

  if (loading || !data) return <View style={[styles.center, { backgroundColor: c.surface }]}><ActivityIndicator color={c.brandPrimary} /></View>;

  const totals = data.totals;
  const u = data.user;
  const nextLevelPct = (u.xp % 100) / 100;
  const maxXp = Math.max(...data.days.map((d: any) => d.xp), 50);

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.onSurface }]}>Progress</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.brandPrimary} />}
          testID="progress-scroll"
        >
          {/* Level ring */}
          <View style={[styles.ringCard, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
            <XPRing xp={u.xp} level={u.level} pct={nextLevelPct} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.ringLabel, { color: c.onSurfaceSecondary }]}>LEVEL</Text>
              <Text style={[styles.ringLevel, { color: c.onSurface }]} testID="prog-level">{u.level}</Text>
              <Text style={[styles.ringXP, { color: c.brandPrimary }]} testID="prog-xp">{u.xp} XP total</Text>
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginTop: 8 }}>
                <Ionicons name="flame" size={14} color={c.warning} />
                <Text style={[styles.ringStreak, { color: c.onSurfaceSecondary }]} testID="prog-streak">{u.streak} day streak</Text>
              </View>
            </View>
          </View>

          {/* Weekly totals */}
          <View style={styles.statRow}>
            <StatCard label="Missions" value={`${totals.missions_completed}/${totals.missions_total || 0}`} icon="checkmark-circle" />
            <StatCard label="XP earned" value={`${totals.xp}`} icon="star" />
            <StatCard label="Consistency" value={`${totals.consistency_pct}%`} icon="pulse" />
          </View>

          {/* XP bar chart */}
          <View style={[styles.chartCard, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
            <Text style={[styles.chartTitle, { color: c.onSurface }]}>XP This Week</Text>
            <View style={styles.chart}>
              {data.days.map((d: any, i: number) => {
                const h = maxXp ? (d.xp / maxXp) * 120 : 0;
                return (
                  <View key={i} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                    <View style={{ height: 130, justifyContent: "flex-end", width: "100%", alignItems: "center" }}>
                      <LinearGradient
                        colors={gradients.brand}
                        style={{ width: "60%", height: Math.max(h, 4), borderRadius: 6, minHeight: 4 }}
                      />
                    </View>
                    <Text style={[styles.chartDay, { color: c.onSurfaceTertiary }]}>{d.day}</Text>
                    <Text style={[styles.chartXP, { color: c.onSurface }]}>{d.xp}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Productivity/Focus scores */}
          <View style={[styles.chartCard, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
            <Text style={[styles.chartTitle, { color: c.onSurface }]}>Daily Focus & Productivity</Text>
            <View style={{ gap: 12, marginTop: spacing.md }}>
              {data.days.map((d: any, i: number) => (
                <View key={i} style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={[styles.rowLabel, { color: c.onSurfaceSecondary }]}>{d.day}</Text>
                    <Text style={[styles.rowMeta, { color: c.onSurfaceTertiary }]}>
                      P:{d.productivity}/5 · F:{d.focus}/5
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <View style={{ flex: 1 }}><ProgressBar value={d.productivity / 5} height={6} color={c.brandPrimary} /></View>
                    <View style={{ flex: 1 }}><ProgressBar value={d.focus / 5} height={6} color={c.brandSecondary} /></View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Badges */}
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[styles.sectionTitle, { color: c.onSurface }]}>Achievements</Text>
            <View style={styles.badgeGrid}>
              {Object.entries(BADGES).map(([k, b]) => {
                const earned = u.badges?.includes(k);
                return (
                  <View key={k} style={[styles.badge, { backgroundColor: c.surfaceSecondary, borderColor: c.border, opacity: earned ? 1 : 0.4 }]}>
                    <LinearGradient colors={earned ? b.colors : [c.surfaceTertiary as any, c.surfaceTertiary as any]}
                      style={styles.badgeIcon}>
                      <Ionicons name={b.icon} size={24} color={earned ? "#fff" : c.onSurfaceTertiary} />
                    </LinearGradient>
                    <Text style={[styles.badgeTitle, { color: c.onSurface }]}>{b.title}</Text>
                    <Text style={[styles.badgeStatus, { color: earned ? c.success : c.onSurfaceTertiary }]}>
                      {earned ? "Unlocked" : "Locked"}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function XPRing({ xp, level, pct }: { xp: number; level: number; pct: number }) {
  const { c } = usePalette();
  const size = 110;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", marginRight: spacing.md }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={c.surfaceTertiary} strokeWidth={stroke} fill="none" />
        <Circle cx={cx} cy={cy} r={r} stroke={c.brandPrimary} strokeWidth={stroke} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text style={{ color: c.onSurface, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 }}>{Math.round(pct * 100)}%</Text>
        <Text style={{ color: c.onSurfaceTertiary, fontSize: 10, fontWeight: "600" }}>TO L{level + 1}</Text>
      </View>
    </View>
  );
}

function StatCard({ label, value, icon }: any) {
  const { c } = usePalette();
  return (
    <View style={[styles.statCard, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
      <Ionicons name={icon} size={16} color={c.brandPrimary} />
      <Text style={[styles.statValue, { color: c.onSurface }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.onSurfaceSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { padding: spacing.lg },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  ringCard: { flexDirection: "row", alignItems: "center", padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1 },
  ringLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6 },
  ringLevel: { fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  ringXP: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  ringStreak: { fontSize: 12, fontWeight: "600" },
  statRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  statCard: { flex: 1, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, gap: 4 },
  statValue: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3, marginTop: 4 },
  statLabel: { fontSize: 11, fontWeight: "600" },
  chartCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginTop: spacing.md },
  chartTitle: { fontSize: 16, fontWeight: "700" },
  chart: { flexDirection: "row", marginTop: spacing.md, alignItems: "flex-end", gap: 4 },
  chartDay: { fontSize: 11, fontWeight: "600" },
  chartXP: { fontSize: 11, fontWeight: "700" },
  rowLabel: { fontSize: 12, fontWeight: "600" },
  rowMeta: { fontSize: 11 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: spacing.md },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  badge: { width: "48%", padding: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: "center", gap: 6 },
  badgeIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  badgeTitle: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  badgeStatus: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
});
