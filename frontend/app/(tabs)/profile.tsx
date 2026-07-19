import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useAuth } from "@/src/auth";
import { usePalette, spacing, radius, gradients } from "@/src/theme";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { c, mode } = usePalette();

  const profile = user?.profile || {};

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
          <Text style={[styles.title, { color: c.onSurface }]}>Profile</Text>

          {/* User card */}
          <LinearGradient
            colors={mode === "dark" ? ["#312E81", "#7C3AED"] : ["#A78BFA", "#7C3AED"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.userCard}
          >
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }]}>
                <Ionicons name="person" size={32} color="#fff" />
              </View>
            )}
            <Text style={styles.userName} testID="profile-name">{user?.name}</Text>
            <Text style={styles.userEmail} testID="profile-email">{user?.email}</Text>
            <View style={styles.userStats}>
              <StatPill icon="star" label="XP" value={user?.xp || 0} />
              <StatPill icon="trophy" label="Level" value={user?.level || 1} />
              <StatPill icon="flame" label="Streak" value={user?.streak || 0} />
            </View>
          </LinearGradient>

          {/* Profile data */}
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[styles.section, { color: c.onSurfaceSecondary }]}>YOUR JOURNEY</Text>
            <View style={[styles.card, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
              {profile.goal && <ProfileRow label="Goal" value={profile.goal} />}
              {profile.career && <ProfileRow label="Career" value={profile.career} />}
              {profile.exams && <ProfileRow label="Exams" value={profile.exams} />}
              {profile.university && <ProfileRow label="Dream college" value={profile.university} />}
              {profile.grade && <ProfileRow label="Grade" value={profile.grade} />}
              {profile.hours && <ProfileRow label="Study hours/day" value={profile.hours} />}
            </View>
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Text style={[styles.section, { color: c.onSurfaceSecondary }]}>ACTIONS</Text>
            <View style={[styles.card, { backgroundColor: c.surfaceSecondary, borderColor: c.border, padding: 0 }]}>
              <ActionRow icon="refresh" label="Regenerate Roadmap" onPress={() => router.push("/(tabs)/roadmap")} />
              <View style={[styles.divider, { backgroundColor: c.divider }]} />
              <ActionRow icon="journal" label="Daily Check-in" onPress={() => router.push("/checkin")} testID="profile-checkin" />
              <View style={[styles.divider, { backgroundColor: c.divider }]} />
              <ActionRow icon="log-out" label="Sign Out" onPress={signOut} destructive testID="signout-button" />
            </View>
          </View>

          <Text style={[styles.footer, { color: c.onSurfaceTertiary }]}>Twin IQ · Powered by Gemini 3 Flash</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatPill({ icon, label, value }: any) {
  return (
    <View style={styles.statPill}>
      <Ionicons name={icon} size={14} color="#fff" />
      <Text style={styles.statPillValue}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

function ProfileRow({ label, value }: any) {
  const { c } = usePalette();
  return (
    <View style={styles.profileRow}>
      <Text style={[styles.profileLabel, { color: c.onSurfaceSecondary }]}>{label}</Text>
      <Text style={[styles.profileValue, { color: c.onSurface }]}>{value}</Text>
    </View>
  );
}

function ActionRow({ icon, label, onPress, destructive, testID }: any) {
  const { c } = usePalette();
  return (
    <Pressable onPress={onPress} testID={testID} style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={20} color={destructive ? c.error : c.brandPrimary} />
      <Text style={[styles.actionLabel, { color: destructive ? c.error : c.onSurface }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={c.onSurfaceTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5, marginBottom: spacing.lg },
  userCard: { padding: spacing.lg, borderRadius: radius.lg, alignItems: "center", gap: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  userName: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 8 },
  userEmail: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  userStats: { flexDirection: "row", gap: 8, marginTop: spacing.md },
  statPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  statPillValue: { color: "#fff", fontSize: 13, fontWeight: "800" },
  statPillLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "600" },
  section: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginBottom: spacing.sm },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  profileRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  profileLabel: { fontSize: 13, fontWeight: "500" },
  profileValue: { fontSize: 14, fontWeight: "600" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
  divider: { height: 1, marginHorizontal: spacing.md },
  footer: { textAlign: "center", marginTop: spacing.xl, fontSize: 11 },
});
