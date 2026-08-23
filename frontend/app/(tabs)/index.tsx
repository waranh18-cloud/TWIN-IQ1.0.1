import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { usePalette, spacing, radius, gradients } from "@/src/theme";
import { Card, ProgressBar } from "@/src/ui";

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const { c, mode } = usePalette();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setData(await api.dashboard()); }
    catch (e: any) { console.log("dashboard err", e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await Promise.all([load(), refreshUser()]); };

  const completeMission = async (mid: string) => {
    if (completingId) return;
    setCompletingId(mid);
    try {
      const result = await api.completeMission(mid);
      await Promise.all([load(), refreshUser()]);
      if (result.xp_gained) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.log("mission complete err", e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setCompletingId(null); }
  };

  if (loading || !data) return <View style={[styles.center, { backgroundColor: c.surface }]}><ActivityIndicator color={c.brandPrimary} size="large" /></View>;

  const stats = data.stats;
  const levelProgress = getLevelProgress(stats.xp);

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brandPrimary} />} testID="dashboard-scroll">
          <View style={styles.headerRow}><View><Text style={[styles.greeting, { color: c.onSurfaceSecondary }]}>Good {timeGreeting()},</Text><Text style={[styles.name, { color: c.onSurface }]} testID="user-name">{user?.name?.split(" ")[0] || "Student"}</Text></View><Pressable onPress={() => router.push("/profile")} testID="header-avatar">{user?.picture ? <Image source={{ uri: user.picture }} style={styles.avatar} /> : <LinearGradient colors={gradients.brand} style={styles.avatar}><Ionicons name="person" size={20} color="#fff" /></LinearGradient>}</Pressable></View>

          <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: radius.lg, overflow: "hidden" }}><LinearGradient colors={mode === "dark" ? ["#312E81", "#7C3AED", "#3B82F6"] : ["#A78BFA", "#7C3AED", "#3B82F6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroTopRow}><View style={styles.pill}><Ionicons name="flame" size={14} color="#fff" /><Text style={styles.pillText} testID="streak-count">{stats.streak} day streak</Text></View><View style={styles.pill}><Ionicons name="trophy" size={14} color="#fff" /><Text style={styles.pillText} testID="level-count">Level {stats.level}</Text></View>{stats.streak_freezes > 0 && <View style={styles.pill}><Ionicons name="snow" size={14} color="#fff" /><Text style={styles.pillText} testID="freeze-count">{stats.streak_freezes}</Text></View>}</View>
            <Text style={styles.heroMsg} testID="motivational-message">{data.roadmap_summary?.motivational_message || "You've got this. Let's make today count."}</Text>
            <View style={styles.xpHeader}><Text style={styles.xpLabel}>LEVEL PROGRESS</Text><Text style={styles.xpVal} testID="xp-value">{stats.xp} XP</Text></View><View style={styles.xpBar}><View style={[styles.xpFill, { width: `${levelProgress.pct * 100}%` }]} /></View><Text style={styles.xpSub}>{levelProgress.into} / {levelProgress.need} XP to next level</Text>
          </LinearGradient></View>

          <View style={styles.scoreRow}><ScoreCard label="Missions" value={`${stats.missions_completed}/${stats.missions_total}`} pct={stats.missions_total ? stats.missions_completed / stats.missions_total : 0} icon="checkmark-circle" testID="score-missions" /><ScoreCard label="Focus" value={`${stats.focus_score}%`} pct={stats.focus_score / 100} icon="eye" testID="score-focus" /><ScoreCard label="Productivity" value={`${stats.productivity_score}%`} pct={stats.productivity_score / 100} icon="rocket" testID="score-productivity" /></View>

          {data.challenge && <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}><View style={[styles.challengeCard, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]} testID="weekly-challenge"><View style={styles.challengeHead}><LinearGradient colors={gradients.sunrise as any} style={styles.challengeIcon}><Ionicons name={data.challenge.icon || "trophy"} size={20} color="#fff" /></LinearGradient><View style={{ flex: 1 }}><Text style={[styles.challengeLabel, { color: c.warning }]}>WEEKLY CHALLENGE</Text><Text style={[styles.challengeTitle, { color: c.onSurface }]}>{data.challenge.title}</Text></View><View style={styles.rewardBadge}><Ionicons name="star" size={11} color={c.warning} /><Text style={[styles.rewardText, { color: c.warning }]}>+{data.challenge.reward_xp}</Text></View></View><Text style={[styles.challengeDesc, { color: c.onSurfaceSecondary }]}>{data.challenge.desc}</Text><View style={{ marginTop: 10 }}><ProgressBar value={data.challenge.target ? Math.min(1, data.challenge.progress / data.challenge.target) : 0} height={8} color={data.challenge.completed ? c.success : undefined} /><View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}><Text style={[styles.challengeProg, { color: c.onSurfaceSecondary }]}>{data.challenge.progress} / {data.challenge.target}</Text>{data.challenge.completed && <Text style={[styles.challengeProg, { color: c.success, fontWeight: "700" }]}>✓ Complete!</Text>}</View></View></View></View>}

          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}><View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: c.onSurface }]}>Today's Missions</Text><Text style={[styles.sectionSub, { color: c.onSurfaceSecondary }]}>{stats.completion_pct}% done</Text></View>{data.missions?.length === 0 && <Card><Text style={{ color: c.onSurfaceSecondary }}>No missions yet. Pull to refresh.</Text></Card>}{data.missions?.map((m: any) => <MissionCard key={m.mission_id} mission={m} loading={completingId === m.mission_id} onComplete={() => completeMission(m.mission_id)} />)}</View>

          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl, gap: spacing.md }}><Pressable onPress={() => router.push("/pomodoro")} testID="pomodoro-cta"><LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}><View style={styles.ctaIcon}><Ionicons name="timer" size={22} color="#fff" /></View><View style={{ flex: 1 }}><Text style={[styles.ctaTitle, { color: "#fff" }]}>Start a Focus Session</Text><Text style={[styles.ctaDesc, { color: "rgba(255,255,255,0.85)" }]}>Earn 1 XP per focused minute.</Text></View><Ionicons name="chevron-forward" size={20} color="#fff" /></LinearGradient></Pressable><Pressable onPress={() => router.push("/checkin")} testID="daily-checkin-cta"><View style={[styles.cta, { backgroundColor: c.surfaceSecondary, borderColor: c.border, borderWidth: 1 }]}><LinearGradient colors={gradients.brand} style={styles.ctaIcon}><Ionicons name="journal" size={22} color="#fff" /></LinearGradient><View style={{ flex: 1 }}><Text style={[styles.ctaTitle, { color: c.onSurface }]}>Daily Check-in</Text><Text style={[styles.ctaDesc, { color: c.onSurfaceSecondary }]}>Reflect today and tune tomorrow's plan.</Text></View><Ionicons name="chevron-forward" size={20} color={c.onSurfaceSecondary} /></View></Pressable></View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function getLevelProgress(xp: number) { let level = 1, need = 100, remaining = Math.max(0, xp); while (remaining >= need) { remaining -= need; level += 1; need = Math.floor(need * 1.25); } return { level, into: remaining, need, pct: need ? remaining / need : 1 }; }
function timeGreeting() { const h = new Date().getHours(); return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening"; }
function ScoreCard({ label, value, pct, icon, testID }: any) { const { c } = usePalette(); return <View style={[styles.scoreCard, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]} testID={testID}><Ionicons name={icon} size={18} color={c.brandPrimary} /><Text style={[styles.scoreValue, { color: c.onSurface }]}>{value}</Text><Text style={[styles.scoreLabel, { color: c.onSurfaceSecondary }]}>{label}</Text><ProgressBar value={Math.max(0, Math.min(1, pct))} height={4} /></View>; }
function MissionCard({ mission, loading, onComplete }: any) { const { c } = usePalette(); return <View style={[styles.missionCard, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}><View style={[styles.missionIcon, { backgroundColor: mission.completed ? c.success + "20" : c.brandTertiary }]}><Ionicons name={mission.completed ? "checkmark" : mission.category === "study" ? "book" : mission.category === "exercise" ? "fitness" : "flash"} size={18} color={mission.completed ? c.success : c.onBrandTertiary} /></View><View style={{ flex: 1 }}><Text style={[styles.missionTitle, { color: c.onSurface }]}>{mission.title}</Text><Text style={[styles.missionMeta, { color: c.onSurfaceSecondary }]}>{mission.duration_min} min • +{mission.xp} XP • {mission.time_of_day}</Text></View>{mission.completed ? <Ionicons name="checkmark-circle" size={26} color={c.success} /> : <Pressable onPress={onComplete} disabled={loading} style={[styles.completeBtn, { backgroundColor: c.brandPrimary }]}>{loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark" size={18} color="#fff" />}</Pressable>}</View>; }

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" }, headerRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, greeting: { fontSize: 13 }, name: { fontSize: 28, fontWeight: "800", marginTop: 1, letterSpacing: -0.8 }, avatar: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" }, hero: { padding: spacing.lg, minHeight: 180 }, heroTopRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" }, pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)" }, pillText: { color: "#fff", fontSize: 12, fontWeight: "700" }, heroMsg: { color: "#fff", fontSize: 18, fontWeight: "800", lineHeight: 24, marginTop: 18, maxWidth: "92%" }, xpHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 18, marginBottom: 6 }, xpLabel: { color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "800", letterSpacing: 0.7 }, xpVal: { color: "#fff", fontSize: 12, fontWeight: "800" }, xpBar: { height: 9, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" }, xpFill: { height: "100%", backgroundColor: "#fff", borderRadius: 999 }, xpSub: { color: "rgba(255,255,255,0.72)", fontSize: 10, marginTop: 5 }, scoreRow: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.lg, marginTop: spacing.lg }, scoreCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 12, minHeight: 100, gap: 5 }, scoreValue: { fontSize: 18, fontWeight: "800" }, scoreLabel: { fontSize: 11, fontWeight: "600" }, challengeCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg }, challengeHead: { flexDirection: "row", alignItems: "center", gap: 12 }, challengeIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" }, challengeLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1 }, challengeTitle: { fontSize: 16, fontWeight: "800", marginTop: 2 }, rewardBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(234,179,8,0.1)" }, rewardText: { fontSize: 11, fontWeight: "800" }, challengeDesc: { fontSize: 13, marginTop: 10 }, challengeProg: { fontSize: 11 }, sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: spacing.md }, sectionTitle: { fontSize: 20, fontWeight: "800" }, sectionSub: { fontSize: 12, fontWeight: "700" }, missionCard: { flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 16, borderWidth: 1, padding: 13, marginBottom: 8 }, missionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }, missionTitle: { fontSize: 14, fontWeight: "700" }, missionMeta: { fontSize: 11, marginTop: 3 }, completeBtn: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" }, cta: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, padding: 14 }, ctaIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" }, ctaTitle: { fontSize: 14, fontWeight: "800" }, ctaDesc: { fontSize: 11, marginTop: 2 },
});
