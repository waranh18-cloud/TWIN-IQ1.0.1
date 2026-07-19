import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/auth";
import { PrimaryButton, SecondaryButton, GlassCard } from "@/src/ui";
import { usePalette, spacing, gradients } from "@/src/theme";

export default function Landing() {
  const { user, loading, signInWithGoogle } = useAuth();
  const { c } = usePalette();

  useEffect(() => {
    if (!loading && user) {
      if (!user.onboarded) router.replace("/onboarding");
      else router.replace("/(tabs)");
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.surface }]} testID="auth-loading">
        <ActivityIndicator color={c.brandPrimary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <LinearGradient
        colors={["#0B0C10", "#1E1B4B", "#312E81"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.xl, justifyContent: "space-between" }}>
          <View style={{ marginTop: spacing.xl }}>
            <View style={styles.logoRow}>
              <LinearGradient colors={gradients.brandVivid} style={styles.logoDot}>
                <Ionicons name="sparkles" size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.brand}>Twin IQ</Text>
            </View>
            <Text style={styles.tagline}>Your AI-powered success coach</Text>
          </View>

          <View style={{ gap: spacing.md }}>
            <GlassCard style={{ padding: spacing.lg }}>
              <FeatureRow icon="rocket" title="Personalized roadmap" desc="AI plans your path daily, weekly & monthly" />
            </GlassCard>
            <GlassCard style={{ padding: spacing.lg }}>
              <FeatureRow icon="trophy" title="Level up like a game" desc="Earn XP, keep streaks, unlock badges" />
            </GlassCard>
            <GlassCard style={{ padding: spacing.lg }}>
              <FeatureRow icon="chatbubbles" title="24/7 AI mentor" desc="Ask anything. Get unstuck. Stay motivated." />
            </GlassCard>
          </View>

          <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
            <PrimaryButton
              testID="google-signin-button"
              title="Continue with Google"
              onPress={signInWithGoogle}
            />
            <Text style={styles.legal}>By continuing you agree to our Terms & Privacy.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function FeatureRow({ icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <LinearGradient colors={gradients.brand} style={styles.featIcon}>
        <Ionicons name={icon} size={20} color="#fff" />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={styles.featTitle}>{title}</Text>
        <Text style={styles.featDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoDot: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  brand: { color: "#fff", fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  tagline: { color: "rgba(255,255,255,0.75)", fontSize: 17, marginTop: 8, fontWeight: "500" },
  featIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  featTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  featDesc: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },
  legal: { color: "rgba(255,255,255,0.5)", fontSize: 11, textAlign: "center" },
});
