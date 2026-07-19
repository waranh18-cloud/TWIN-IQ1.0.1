import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { usePalette, spacing, radius, gradients } from "@/src/theme";
import { Card, GlassCard, ProgressBar } from "@/src/ui";

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const { c, mode } = usePalette();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.dashboard();
      setData(d);
    } catch (e) {
      console.log("dashboard err", e);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); refreshUser(); };

  const completeMission = async (mid: string) => {
    setCompletingId(mid);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await api.completeMission(mid);
      await load();
      await refreshUser();
    } catch (e) { console.log(e); }
    setCompletingId(null);
  };

  if (loading || !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.surface }]}>
        <ActivityIndicator color={c.brandPrimary} size="large" />
      </View>
    );
  }

  const stats = data.stats;
  const nextLevelPct = ((stats.xp % 100) / 100);

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brandPrimary} />}
          testID="dashboard-scroll"
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.greeting, { color: c.onSurfaceSecondary }]}>Good {timeGreeting()},</Text>
              <Text style={[styles.name, { color: c.onSurface }]} testID="user-name">{user?.name?.split(" ")[0] || "Student"}</Text>
            </View>
            <Pressable onPress={() => router.push("/profile")} testID="header-avatar">
              {user?.picture ? (
                <Image source={{ uri: user.picture }} style={styles.avatar} />
              ) : (
                <LinearGradient colors={gradients.brand} style={styles.avatar}>
                  <Ionicons name="person" size={20} color="#fff" />
                </LinearGradient>
              )}
            </Pressable>
          </View>

          {/* Hero glass card */}
          <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: radius.lg, overflow: "hidden" }}>
            <LinearGradient
              colors={mode === "dark" ? ["#312E81", "#7C3AED", "#3B82F6"] : ["#A78BFA", "#7C3AED", "#3B82F6"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.pill}>
                  <Ionicons name="flame" size={14} color="#fff" />
                  <Text style={styles.pillText} testID="streak-count">{stats.streak} day streak</Text>
                </View>
                <View style={styles.pill}>
                  <Ionicons name="trophy" size={14} color="#fff" />
                  <Text style={styles.pillText} testID="level-count">Level {stats.level}</Text>
                </View>
                {stats.streak_freezes > 0 && (
                  <View style={styles.pill}>
                    <Ionicons name="snow" size={14} color="#fff" />
                    <Text style={styles.pillText} testID="freeze-count">{stats.streak_freezes}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.heroMsg} testID="motivational-message">
                {data.roadmap_summary?.motivational_message || "You've got this. Let's make today count."}
              </Text>
              <View style={styles.xpRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={styles.xpLabel}>XP</Text>
                    <Text style={styles.xpVal} testID="xp-value">{stats.xp}</Text>
                  </View>
                  <View style={styles.xpBar}>
                    <View style={[styles.xpFill, { width: `${nextLevelPct * 100}%` }]} />
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Score cards */}
          <View style={styles.scoreRow}>
            <ScoreCard label="Missions" value={`${stats.missions_completed}/${stats.missions_total}`}
              pct={stats.missions_total ? stats.missions_completed / stats.missions_total : 0}
              icon="checkmark-circle" testID="score-missions" />
            <ScoreCard label="Focus" value={`${stats.focus_score}%`} pct={stats.focus_score / 100} icon="eye" testID="score-focus" />
            <ScoreCard label="Productivity" value={`${stats.productivity_score}%`} pct={stats.productivity_score / 100} icon="rocket" testID="score-productivity" />
          </View>

          {/* Weekly Challenge card */}
          {data.challenge && (
            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
              <View style={[styles.challengeCard, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]} testID="weekly-challenge">
                <View style={styles.challengeHead}>
                  <LinearGradient colors={gradients.sunrise as any} style={styles.challengeIcon}>
                    <Ionicons name={data.challenge.icon || "trophy"} size={20} color="#fff" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.challengeLabel, { color: c.warning }]}>WEEKLY CHALLENGE</Text>
                    <Text style={[styles.challengeTitle, { color: c.onSurface }]}>{data.challenge.title}</Text>
                  </View>
                  <View style={styles.rewardBadge}>
                    <Ionicons name="star" size={11} color={c.warning} />
                    <Text style={[styles.rewardText, { color: c.warning }]}>+{data.challenge.reward_xp}</Text>
                  </View>
                </View>
                <Text style={[styles.challengeDesc, { color: c.onSurfaceSecondary }]}>
                  {data.challenge.desc}
                </Text>
                <View style={{ marginTop: 10 }}>
                  <ProgressBar
                    value={data.challenge.target ? Math.min(1, data.challenge.progress / data.challenge.target) : 0}
                    height={8}
                    color={data.challenge.completed ? c.success : undefined}
                  />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                    <Text style={[styles.challengeProg, { color: c.onSurfaceSecondary }]}>
                      {data.challenge.progress} / {data.challenge.target}
                    </Text>
                    {data.challenge.completed && (
                      <Text style={[styles.challengeProg, { color: c.success, fontWeight: "700" }]}>
                        ✓ Complete!
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Today's missions */}
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: c.onSurface }]}>Today's Missions</Text>
              <Text style={[styles.sectionSub, { color: c.onSurfaceSecondary }]}>{stats.completion_pct}% done</Text>
            </View>

            {data.missions?.length === 0 && (
              <Card><Text style={{ color: c.onSurfaceSecondary }}>No missions yet. Pull to refresh.</Text></Card>
            )}

            {data.missions?.map((m: any, i: number) => (
              <MissionCard
                key={m.mission_id}
                mission={m}
                loading={completingId === m.mission_id}
                onComplete={() => completeMission(m.mission_id)}
              />
            ))}
          </View>

          {/* Daily Check-in CTA */}
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl, gap: spacing.md }}>
            <Pressable onPress={() => router.push("/pomodoro")} testID="pomodoro-cta">
              <LinearGradient
                colors={gradients.brand as any}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.checkinCta}
              >
                <View style={styles.checkinIcon}>
                  <View style={[styles.checkinIconInner, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                    <Ionicons name="timer" size={22} color="#fff" />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.checkinTitle, { color: "#fff" }]}>Start a Focus Session</Text>
                  <Text style={[styles.checkinDesc, { color: "rgba(255,255,255,0.85)" }]}>
                    25min Pomodoro. Earn XP per minute focused.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </LinearGradient>
            </Pressable>

            <Pressable onPress={() => router.push("/checkin")} testID="daily-checkin-cta">
              <LinearGradient
                colors={mode === "dark" ? ["#161821", "#1E1B4B"] : ["#EDE9FE", "#DBEAFE"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.checkinCta}
              >
                <View style={styles.checkinIcon}>
                  <LinearGradient colors={gradients.brand} style={styles.checkinIconInner}>
                    <Ionicons name="journal" size={22} color="#fff" />
                  </LinearGradient>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.checkinTitle, { color: c.onSurface }]}>Daily Check-in</Text>
                  <Text style={[styles.checkinDesc, { color: c.onSurfaceSecondary }]}>
                    Reflect on today. AI will tune tomorrow.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={c.onSurfaceSecondary} />
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ScoreCard({ label, value, pct, icon, testID }: any) {
  const { c } = usePalette();
  return (
    <View style={[styles.scoreCard, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]} testID={testID}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Ionicons name={icon} size={14} color={c.brandPrimary} />
        <Text style={[styles.scoreLabel, { color: c.onSurfaceSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.scoreVal, { color: c.onSurface }]}>{value}</Text>
      <View style={{ marginTop: 10 }}>
        <ProgressBar value={pct} height={5} />
      </View>
    </View>
  );
}

function MissionCard({ mission, loading, onComplete }: any) {
  const { c } = usePalette();
  const done = mission.completed;
  const catIcons: Record<string, any> = {
    study: "book", revision: "reload", mock: "clipboard", reading: "library",
    exercise: "barbell", habit: "sparkles", break: "cafe", reflection: "moon",
  };
  return (
    <View style={[styles.missionCard, { backgroundColor: c.surfaceSecondary, borderColor: done ? c.success : c.border }]}
      testID={`mission-${mission.mission_id}`}>
      <View style={styles.missionIconWrap}>
        <LinearGradient
          colors={done ? ["#10B981", "#059669"] : gradients.brand}
          style={styles.missionIcon}
        >
          {done ? <Ionicons name="checkmark" size={18} color="#fff" /> :
            <Ionicons name={catIcons[mission.category] || "flash"} size={18} color="#fff" />}
        </LinearGradient>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.missionTitle, {
          color: c.onSurface,
          textDecorationLine: done ? "line-through" : "none",
          opacity: done ? 0.6 : 1
        }]}>
          {mission.title}
        </Text>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
          <Text style={[styles.missionMeta, { color: c.onSurfaceTertiary }]}>⏱ {mission.duration_min}m</Text>
          <Text style={[styles.missionMeta, { color: c.brandPrimary, fontWeight: "700" }]}>+{mission.xp} XP</Text>
          <Text style={[styles.missionMeta, { color: c.onSurfaceTertiary }]}>{mission.time_of_day}</Text>
        </View>
      </View>
      {!done && (
        <>
          <Pressable
            onPress={() => router.push({ pathname: "/pomodoro", params: { missionId: mission.mission_id, missionTitle: mission.title } })}
            testID={`focus-${mission.mission_id}`}
            style={[styles.completeBtn, { borderColor: c.border, marginRight: 6 }]}>
            <Ionicons name="timer-outline" size={18} color={c.brandSecondary} />
          </Pressable>
          <Pressable onPress={onComplete} disabled={loading}
            testID={`complete-${mission.mission_id}`}
            style={[styles.completeBtn, { borderColor: c.border }]}>
            {loading ? <ActivityIndicator size="small" color={c.brandPrimary} /> :
              <Ionicons name="checkmark" size={18} color={c.brandPrimary} />}
          </Pressable>
        </>
      )}
    </View>
  );
}

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  greeting: { fontSize: 14, fontWeight: "500" },
  name: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  hero: { padding: spacing.lg, minHeight: 180, justifyContent: "space-between" },
  heroTopRow: { flexDirection: "row", gap: 8 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  heroMsg: { color: "#fff", fontSize: 17, fontWeight: "600", lineHeight: 23, marginTop: 16 },
  xpRow: { flexDirection: "row", alignItems: "center", marginTop: 16 },
  xpLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  xpVal: { color: "#fff", fontSize: 13, fontWeight: "800" },
  xpBar: { height: 6, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 999, overflow: "hidden" },
  xpFill: { height: "100%", backgroundColor: "#fff", borderRadius: 999 },
  scoreRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  scoreCard: { flex: 1, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  scoreLabel: { fontSize: 11, fontWeight: "600" },
  scoreVal: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: spacing.md },
  sectionTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  sectionSub: { fontSize: 12, fontWeight: "600" },
  missionCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1, marginBottom: 10 },
  missionIconWrap: {},
  missionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  missionTitle: { fontSize: 15, fontWeight: "600" },
  missionMeta: { fontSize: 12, fontWeight: "500" },
  completeBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  checkinCta: { flexDirection: "row", alignItems: "center", padding: spacing.md, borderRadius: radius.lg, gap: 12 },
  checkinIcon: {},
  checkinIconInner: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  checkinTitle: { fontSize: 15, fontWeight: "700" },
  checkinDesc: { fontSize: 12, marginTop: 2 },
  challengeCard: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  challengeHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  challengeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  challengeLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.7 },
  challengeTitle: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  rewardBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(245,158,11,0.15)" },
  rewardText: { fontSize: 11, fontWeight: "800" },
  challengeDesc: { fontSize: 12, marginTop: 8 },
  challengeProg: { fontSize: 11, fontWeight: "600" },
});
