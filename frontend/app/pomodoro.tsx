import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Vibration } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Circle } from "react-native-svg";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "@/src/api";
import { usePalette, spacing, radius, gradients } from "@/src/theme";

const PRESETS: { label: string; focus: number; brk: number }[] = [
  { label: "Classic", focus: 25, brk: 5 },
  { label: "Deep", focus: 50, brk: 10 },
  { label: "Sprint", focus: 15, brk: 3 },
];

type Phase = "focus" | "break";

export default function Pomodoro() {
  const params = useLocalSearchParams<{ missionId?: string; missionTitle?: string }>();
  const { c } = usePalette();
  const [preset, setPreset] = useState(0);
  const [phase, setPhase] = useState<Phase>("focus");
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(PRESETS[0].focus * 60);
  const [stats, setStats] = useState<any>(null);
  const [finishing, setFinishing] = useState(false);
  const intervalRef = useRef<any>(null);

  const total = (phase === "focus" ? PRESETS[preset].focus : PRESETS[preset].brk) * 60;

  useEffect(() => { loadStats(); }, []);

  useEffect(() => {
    // Reset when preset or phase changes
    setSecondsLeft(total);
  }, [preset, phase]);

  const loadStats = async () => {
    try { const r = await api.pomodoroStats(); setStats(r); } catch {}
  };

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setRunning(false);
          onComplete();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const onComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Vibration.vibrate([0, 300, 100, 300]);
    setFinishing(true);
    try {
      await api.pomodoroSession(
        phase === "focus" ? PRESETS[preset].focus : PRESETS[preset].brk,
        phase,
        params.missionId as string | undefined,
      );
      await loadStats();
    } catch {}
    setFinishing(false);
    setPhase(phase === "focus" ? "break" : "focus");
  };

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRunning(!running);
  };

  const reset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRunning(false);
    setSecondsLeft(total);
  };

  const skip = () => {
    setRunning(false);
    setPhase(phase === "focus" ? "break" : "focus");
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const pct = 1 - secondsLeft / total;

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.onSurface }]}>Focus Timer</Text>
          <Pressable onPress={() => router.back()} testID="close-pomodoro">
            <Ionicons name="close-circle" size={30} color={c.onSurfaceTertiary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, alignItems: "center", paddingBottom: spacing.xxxl }}>
          {params.missionTitle && (
            <View style={[styles.missionPill, { backgroundColor: c.brandTertiary }]}>
              <Ionicons name="flag" size={14} color={c.onBrandTertiary} />
              <Text style={[styles.missionPillText, { color: c.onBrandTertiary }]} numberOfLines={1}>
                {params.missionTitle}
              </Text>
            </View>
          )}

          <View style={styles.presets}>
            {PRESETS.map((p, i) => (
              <Pressable key={p.label} onPress={() => { setPreset(i); setRunning(false); }}
                testID={`preset-${p.label.toLowerCase()}`}
                style={[styles.presetItem, {
                  backgroundColor: preset === i ? c.brandPrimary : c.surfaceSecondary,
                  borderColor: preset === i ? c.brandPrimary : c.border,
                }]}>
                <Text style={{ color: preset === i ? "#fff" : c.onSurface, fontWeight: "700", fontSize: 13 }}>
                  {p.label}
                </Text>
                <Text style={{ color: preset === i ? "rgba(255,255,255,0.85)" : c.onSurfaceTertiary, fontSize: 10, fontWeight: "600" }}>
                  {p.focus}m • {p.brk}m
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.timerWrap}>
            <TimerRing pct={pct} phase={phase} />
            <View style={styles.timerCenter}>
              <View style={[styles.phasePill, { backgroundColor: phase === "focus" ? c.brandTertiary : c.surfaceSecondary }]}>
                <Ionicons name={phase === "focus" ? "flash" : "cafe"} size={12}
                  color={phase === "focus" ? c.onBrandTertiary : c.onSurfaceSecondary} />
                <Text style={{ color: phase === "focus" ? c.onBrandTertiary : c.onSurfaceSecondary, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {phase === "focus" ? "Focus" : "Break"}
                </Text>
              </View>
              <Text style={[styles.time, { color: c.onSurface }]} testID="pomodoro-time">{mm}:{ss}</Text>
              <Text style={[styles.timeSub, { color: c.onSurfaceTertiary }]}>
                {phase === "focus" ? "Deep work in progress" : "Recharge time"}
              </Text>
            </View>
          </View>

          <View style={styles.controls}>
            <Pressable onPress={reset} testID="pomodoro-reset"
              style={[styles.ctrlBtn, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
              <Ionicons name="refresh" size={22} color={c.onSurface} />
            </Pressable>
            <Pressable onPress={toggle} testID="pomodoro-toggle" style={{ borderRadius: 999, overflow: "hidden" }}>
              <LinearGradient colors={gradients.brand} style={styles.playBtn}>
                <Ionicons name={running ? "pause" : "play"} size={30} color="#fff" />
              </LinearGradient>
            </Pressable>
            <Pressable onPress={skip} testID="pomodoro-skip"
              style={[styles.ctrlBtn, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
              <Ionicons name="play-skip-forward" size={20} color={c.onSurface} />
            </Pressable>
          </View>

          {finishing && (
            <View style={{ marginTop: spacing.md, alignItems: "center" }}>
              <ActivityIndicator color={c.brandPrimary} />
              <Text style={{ color: c.onSurfaceSecondary, fontSize: 12, marginTop: 4 }}>Saving session...</Text>
            </View>
          )}

          {stats && (
            <View style={[styles.statsCard, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
              <Text style={[styles.statsTitle, { color: c.onSurface }]}>Your Focus Stats</Text>
              <View style={styles.statsRow}>
                <StatBlock label="Today" val={`${stats.today_count}`} sub={`${stats.today_minutes}m`} />
                <View style={[styles.divider, { backgroundColor: c.divider }]} />
                <StatBlock label="This Week" val={`${stats.week_count}`} sub={`${stats.week_minutes}m`} />
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function TimerRing({ pct, phase }: { pct: number; phase: Phase }) {
  const { c } = usePalette();
  const size = 260;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} stroke={c.surfaceTertiary} strokeWidth={stroke} fill="none" />
      <Circle
        cx={cx} cy={cy} r={r}
        stroke={phase === "focus" ? c.brandPrimary : c.brandSecondary}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </Svg>
  );
}

function StatBlock({ label, val, sub }: any) {
  const { c } = usePalette();
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Text style={{ color: c.onSurfaceSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ color: c.onSurface, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 }}>{val}</Text>
      <Text style={{ color: c.onSurfaceTertiary, fontSize: 12, fontWeight: "600" }}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  missionPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, maxWidth: 320, marginBottom: spacing.md },
  missionPillText: { fontSize: 12, fontWeight: "700", maxWidth: 260 },
  presets: { flexDirection: "row", gap: 8, marginBottom: spacing.xl },
  presetItem: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, alignItems: "center", gap: 2 },
  timerWrap: { width: 260, height: 260, alignItems: "center", justifyContent: "center" },
  timerCenter: { position: "absolute", alignItems: "center", gap: 6 },
  phasePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  time: { fontSize: 60, fontWeight: "800", letterSpacing: -2 },
  timeSub: { fontSize: 12, fontWeight: "600" },
  controls: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginTop: spacing.xl },
  ctrlBtn: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  playBtn: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
  statsCard: { width: "100%", padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginTop: spacing.xl },
  statsTitle: { fontSize: 15, fontWeight: "700", marginBottom: spacing.md },
  statsRow: { flexDirection: "row", alignItems: "center" },
  divider: { width: 1, height: 36, marginHorizontal: 8 },
});
