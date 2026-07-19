import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/src/api";
import { usePalette, spacing, radius, gradients } from "@/src/theme";
import { Chip } from "@/src/ui";

const STARTERS = [
  "I'm feeling burned out",
  "How do I stop procrastinating?",
  "Give me a study technique",
  "Motivate me for today",
];

type Msg = { role: "user" | "assistant"; text: string; message_id?: string };

export default function Coach() {
  const { c, mode } = usePalette();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 12 : 20);
  const tabBarHeight = 60 + bottomInset; // must match _layout.tsx
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.coachHistory();
        setMessages(r.messages.map((m: any) => ({ role: m.role, text: m.text, message_id: m.message_id })));
      } catch {}
      setLoadingHistory(false);
    })();
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages, sending]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: t }]);
    setSending(true);
    try {
      const r = await api.coachSend(t);
      setMessages((m) => [...m, { role: "assistant", text: r.reply, message_id: r.message?.message_id }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", text: `Oops, couldn't connect. ${e.message}` }]);
    }
    setSending(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={styles.header}>
          <LinearGradient colors={gradients.brandVivid} style={styles.avatar}>
            <Ionicons name="sparkles" size={16} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: c.onSurface }]}>AI Coach</Text>
            <Text style={[styles.sub, { color: c.onSurfaceSecondary }]}>Gemini 3 Flash · always here</Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.md }}
            testID="coach-scroll"
          >
            {loadingHistory ? (
              <ActivityIndicator color={c.brandPrimary} />
            ) : messages.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
                <LinearGradient colors={gradients.brand} style={styles.emptyIcon}>
                  <Ionicons name="sparkles" size={28} color="#fff" />
                </LinearGradient>
                <Text style={[styles.emptyTitle, { color: c.onSurface }]}>Ask me anything</Text>
                <Text style={[styles.emptyDesc, { color: c.onSurfaceSecondary }]}>Concepts, motivation, planning — I've got you.</Text>
                <View style={{ marginTop: spacing.lg, gap: spacing.sm, width: "100%" }}>
                  {STARTERS.map((s) => (
                    <Pressable key={s} onPress={() => send(s)} testID={`starter-${s.substring(0,10)}`}
                      style={[styles.starter, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
                      <Ionicons name="chatbubble-outline" size={16} color={c.brandPrimary} />
                      <Text style={[styles.starterText, { color: c.onSurface }]}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              messages.map((m, i) => (
                <View key={i} style={[styles.msgRow, m.role === "user" ? { justifyContent: "flex-end" } : {}]}>
                  {m.role === "assistant" && (
                    <LinearGradient colors={gradients.brand} style={styles.msgAvatar}>
                      <Ionicons name="sparkles" size={12} color="#fff" />
                    </LinearGradient>
                  )}
                  <View style={[
                    styles.bubble,
                    m.role === "assistant"
                      ? { backgroundColor: c.surfaceSecondary, borderColor: c.border, borderTopLeftRadius: 6 }
                      : { backgroundColor: c.brandPrimary, borderTopRightRadius: 6 }
                  ]}>
                    <Text style={{ color: m.role === "assistant" ? c.onSurface : "#fff", fontSize: 15, lineHeight: 21 }}>
                      {m.text}
                    </Text>
                  </View>
                </View>
              ))
            )}
            {sending && (
              <View style={styles.msgRow}>
                <LinearGradient colors={gradients.brand} style={styles.msgAvatar}>
                  <Ionicons name="sparkles" size={12} color="#fff" />
                </LinearGradient>
                <View style={[styles.bubble, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
                  <TypingDots color={c.onSurfaceTertiary} />
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[styles.inputArea, {
            backgroundColor: c.surface,
            borderTopColor: c.divider,
            paddingBottom: tabBarHeight + 12,
          }]}>
            <View style={styles.inputRow}>
              <TextInput
                testID="coach-input"
                value={input}
                onChangeText={setInput}
                placeholder="Ask your coach anything..."
                placeholderTextColor={c.onSurfaceTertiary}
                style={[styles.input, { color: c.onSurface, backgroundColor: c.surfaceSecondary, borderColor: c.border }]}
                onSubmitEditing={() => send(input)}
                multiline
              />
              <Pressable testID="coach-send" onPress={() => send(input)} disabled={sending}
                style={{ borderRadius: 999, overflow: "hidden" }}>
                <LinearGradient colors={gradients.brand} style={styles.sendBtn}>
                  <Ionicons name="arrow-up" size={20} color="#fff" />
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function TypingDots({ color }: { color: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 4, paddingVertical: 4 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: 0.4 + i * 0.2 }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.lg },
  avatar: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  sub: { fontSize: 12, marginTop: 2 },
  emptyIcon: { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 22, fontWeight: "800", marginTop: 16, letterSpacing: -0.3 },
  emptyDesc: { fontSize: 14, marginTop: 4, textAlign: "center" },
  starter: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 16, borderWidth: 1 },
  starterText: { fontSize: 14, fontWeight: "600", flex: 1 },
  msgRow: { flexDirection: "row", marginBottom: spacing.md, alignItems: "flex-end", gap: 8 },
  msgAvatar: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: "transparent" },
  inputArea: { borderTopWidth: 1, paddingTop: spacing.sm },
  inputRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: spacing.lg, gap: spacing.sm },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: 24, borderWidth: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, fontSize: 15 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});
