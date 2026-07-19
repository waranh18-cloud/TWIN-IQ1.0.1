import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { api } from "@/src/api";
import { usePalette, spacing, radius, gradients } from "@/src/theme";
import { PrimaryButton } from "@/src/ui";

const MOODS = [
  { v: 1, e: "😞", l: "Rough" },
  { v: 2, e: "😐", l: "Meh" },
  { v: 3, e: "🙂", l: "Okay" },
  { v: 4, e: "😄", l: "Good" },
  { v: 5, e: "🤩", l: "Amazing" },
];

export default function Checkin() {
  const { c, mode } = usePalette();
  const [mood, setMood] = useState(3);
  const [productivity, setProductivity] = useState(3);
  const [focus, setFocus] = useState(3);
  const [distractions, setDistractions] = useState("");
  const [learning, setLearning] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    try {
      const r = await api.checkin({
        mood, productivity, focus, distractions, learning, completed_tasks_ratio: 0.7,
      });
      setInsight(r.insight);
    } catch (e: any) {
      setInsight(`Couldn't save: ${e.message}`);
    }
    setSubmitting(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.onSurface }]}>Daily Check-in</Text>
          <Pressable onPress={() => router.back()} testID="close-checkin">
            <Ionicons name="close-circle" size={30} color={c.onSurfaceTertiary} />
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }} testID="checkin-scroll">
            {insight ? (
              <View>
                <LinearGradient colors={gradients.brand} style={styles.insightCard}>
                  <Ionicons name="sparkles" size={22} color="#fff" />
                  <Text style={styles.insightLabel}>AI Reflection</Text>
                  <Text style={styles.insightText}>{insight}</Text>
                </LinearGradient>
                <PrimaryButton title="Done" onPress={() => router.back()} testID="checkin-done" />
              </View>
            ) : (
              <>
                <Text style={[styles.subtitle, { color: c.onSurfaceSecondary }]}>A few quick reflections to tune tomorrow.</Text>

                <Text style={[styles.q, { color: c.onSurface }]}>How's your mood?</Text>
                <View style={styles.moodRow}>
                  {MOODS.map((m) => (
                    <Pressable key={m.v} onPress={() => setMood(m.v)} testID={`mood-${m.v}`}
                      style={[styles.moodItem, { borderColor: mood === m.v ? c.brandPrimary : c.border, backgroundColor: mood === m.v ? c.brandTertiary : c.surfaceSecondary }]}>
                      <Text style={{ fontSize: 26 }}>{m.e}</Text>
                      <Text style={[styles.moodLabel, { color: mood === m.v ? c.onBrandTertiary : c.onSurfaceSecondary }]}>{m.l}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.q, { color: c.onSurface }]}>Productivity today</Text>
                <RatingRow value={productivity} onChange={setProductivity} testID="rating-productivity" />

                <Text style={[styles.q, { color: c.onSurface }]}>Focus level</Text>
                <RatingRow value={focus} onChange={setFocus} testID="rating-focus" />

                <Text style={[styles.q, { color: c.onSurface }]}>What distracted you?</Text>
                <TextInput
                  testID="distractions-input"
                  value={distractions}
                  onChangeText={setDistractions}
                  placeholder="Phone, friends, overthinking..."
                  placeholderTextColor={c.onSurfaceTertiary}
                  style={[styles.textArea, { backgroundColor: c.surfaceSecondary, borderColor: c.border, color: c.onSurface }]}
                  multiline
                />

                <Text style={[styles.q, { color: c.onSurface }]}>Something you learned</Text>
                <TextInput
                  testID="learning-input"
                  value={learning}
                  onChangeText={setLearning}
                  placeholder="A concept, insight, or win..."
                  placeholderTextColor={c.onSurfaceTertiary}
                  style={[styles.textArea, { backgroundColor: c.surfaceSecondary, borderColor: c.border, color: c.onSurface }]}
                  multiline
                />

                <View style={{ marginTop: spacing.xl }}>
                  {submitting ? (
                    <View style={styles.loading}>
                      <ActivityIndicator color={c.brandPrimary} />
                      <Text style={{ color: c.onSurfaceSecondary, marginTop: 8, fontSize: 13 }}>
                        Analyzing your day...
                      </Text>
                    </View>
                  ) : (
                    <PrimaryButton title="Submit Check-in" onPress={submit} testID="submit-checkin" />
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function RatingRow({ value, onChange, testID }: any) {
  const { c } = usePalette();
  return (
    <View style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} testID={`${testID}-${n}`}
          style={[styles.ratingItem, { borderColor: value >= n ? c.brandPrimary : c.border, backgroundColor: value >= n ? c.brandPrimary : c.surfaceSecondary }]}>
          <Text style={{ color: value >= n ? "#fff" : c.onSurface, fontSize: 15, fontWeight: "700" }}>{n}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 14, marginBottom: spacing.lg },
  q: { fontSize: 15, fontWeight: "700", marginTop: spacing.lg, marginBottom: spacing.sm },
  moodRow: { flexDirection: "row", gap: 6, justifyContent: "space-between" },
  moodItem: { flex: 1, padding: 10, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 2 },
  moodLabel: { fontSize: 10, fontWeight: "700" },
  ratingRow: { flexDirection: "row", gap: 8 },
  ratingItem: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  textArea: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 14, minHeight: 70, textAlignVertical: "top" },
  loading: { alignItems: "center", padding: spacing.lg },
  insightCard: { padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.lg, gap: 8 },
  insightLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  insightText: { color: "#fff", fontSize: 16, lineHeight: 22, fontWeight: "500" },
});
