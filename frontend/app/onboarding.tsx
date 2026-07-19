import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { usePalette, spacing, radius, gradients } from "@/src/theme";
import { Chip, PrimaryButton } from "@/src/ui";

type Question = { id: string; q: string; chips: string[] };

export default function Onboarding() {
  const { user, refreshUser } = useAuth();
  const { c, mode } = usePalette();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "bot" | "user"; text: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      const r = await api.onboardingQuestions();
      setQuestions(r.questions);
      const first = r.questions[0];
      if (first) {
        setMessages([
          { role: "bot", text: `Hey ${user?.name?.split(" ")[0] || "there"}! I'm Twin IQ, your AI coach.` },
          { role: "bot", text: first.q },
        ]);
      }
    })();
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages]);

  const current = questions[idx];

  const submitAnswer = async (val: string) => {
    if (!val.trim() || !current) return;
    const newAnswers = { ...answers, [current.id]: val };
    setAnswers(newAnswers);
    setMessages((m) => [...m, { role: "user", text: val }]);
    setInput("");

    const nextIdx = idx + 1;
    if (nextIdx < questions.length) {
      const next = questions[nextIdx];
      setTimeout(() => {
        setMessages((m) => [...m, { role: "bot", text: next.q }]);
        setIdx(nextIdx);
      }, 400);
    } else {
      // done - submit to backend
      setMessages((m) => [...m, { role: "bot", text: "Perfect! Building your personalized roadmap now..." }]);
      setSubmitting(true);
      try {
        const payload = questions.map((q) => ({
          question_id: q.id,
          question: q.q,
          answer: newAnswers[q.id] || "",
        }));
        await api.completeOnboarding(payload);
        await refreshUser();
        router.replace("/(tabs)");
      } catch (e: any) {
        setMessages((m) => [...m, { role: "bot", text: `Something went wrong: ${e.message}. Please try again.` }]);
        setSubmitting(false);
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <LinearGradient
        colors={mode === "dark" ? ["#0B0C10", "#1E1B4B"] : ["#EEF2FF", "#F5F3FF"]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <LinearGradient colors={gradients.brandVivid} style={styles.logoDot}>
              <Ionicons name="sparkles" size={14} color="#fff" />
            </LinearGradient>
            <Text style={[styles.brand, { color: c.onSurface }]}>Twin IQ</Text>
          </View>
          <View style={styles.progress}>
            <View style={[styles.progressBar, { backgroundColor: c.surfaceTertiary }]}>
              <LinearGradient
                colors={gradients.brand}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.progressFill, {
                  width: `${questions.length ? Math.round(((idx) / questions.length) * 100) : 0}%`
                }]}
              />
            </View>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
            testID="onboarding-chat"
          >
            {messages.map((m, i) => (
              <View key={i} style={[styles.msgRow, m.role === "user" ? { justifyContent: "flex-end" } : {}]}>
                {m.role === "bot" && (
                  <LinearGradient colors={gradients.brand} style={styles.avatar}>
                    <Ionicons name="sparkles" size={13} color="#fff" />
                  </LinearGradient>
                )}
                <View style={[
                  styles.bubble,
                  m.role === "bot"
                    ? { backgroundColor: c.surfaceSecondary, borderColor: c.border, borderTopLeftRadius: 6 }
                    : { backgroundColor: c.brandPrimary, borderTopRightRadius: 6 }
                ]}>
                  <Text style={{ color: m.role === "bot" ? c.onSurface : "#fff", fontSize: 15, lineHeight: 21 }}>
                    {m.text}
                  </Text>
                </View>
              </View>
            ))}
            {submitting && (
              <View style={{ padding: spacing.lg, alignItems: "center" }}>
                <ActivityIndicator color={c.brandPrimary} />
                <Text style={{ color: c.onSurfaceSecondary, marginTop: 8, fontSize: 13 }}>
                  Crafting your roadmap with Gemini 3 Flash...
                </Text>
              </View>
            )}
          </ScrollView>

          {!submitting && current && (
            <View style={[styles.inputArea, { backgroundColor: c.surface, borderTopColor: c.divider }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm }}>
                {current.chips.map((chip) => (
                  <Chip key={chip} label={chip} onPress={() => submitAnswer(chip)}
                    testID={`chip-${chip.replace(/\s+/g, "-").toLowerCase()}`} />
                ))}
              </ScrollView>
              <View style={styles.inputRow}>
                <TextInput
                  testID="onboarding-input"
                  value={input}
                  onChangeText={setInput}
                  placeholder="Type your answer..."
                  placeholderTextColor={c.onSurfaceTertiary}
                  style={[styles.input, { color: c.onSurface, backgroundColor: c.surfaceSecondary, borderColor: c.border }]}
                  onSubmitEditing={() => submitAnswer(input)}
                  returnKeyType="send"
                />
                <Pressable
                  testID="onboarding-send"
                  onPress={() => submitAnswer(input)}
                  style={{ borderRadius: 999, overflow: "hidden" }}>
                  <LinearGradient colors={gradients.brand} style={styles.sendBtn}>
                    <Ionicons name="arrow-up" size={20} color="#fff" />
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoDot: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 15, fontWeight: "700" },
  progress: {},
  progressBar: { height: 6, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  msgRow: { flexDirection: "row", marginBottom: spacing.md, alignItems: "flex-end", gap: 8 },
  avatar: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  bubble: {
    maxWidth: "80%", paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: "transparent",
  },
  inputArea: { borderTopWidth: 1, paddingTop: spacing.sm, paddingBottom: spacing.md },
  inputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, gap: spacing.sm },
  input: { flex: 1, height: 48, borderRadius: 24, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});
