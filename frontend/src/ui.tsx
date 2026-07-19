import React from "react";
import { View, Text, StyleSheet, Pressable, ViewStyle, TextStyle, StyleProp } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { usePalette, radius, spacing, gradients } from "./theme";
import * as Haptics from "expo-haptics";

export function GradientBG({ children, style, colors }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; colors?: readonly [string, string, ...string[]] }) {
  return (
    <LinearGradient
      colors={colors ?? gradients.brand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}

export function GlassCard({ children, style, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  const { c, mode } = usePalette();
  return (
    <BlurView intensity={mode === "dark" ? 40 : 60} tint={mode === "dark" ? "dark" : "light"}
      style={[{ borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: c.glassBorder, backgroundColor: c.glass }, style]}
      testID={testID}
    >
      {children}
    </BlurView>
  );
}

export function Card({ children, style, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  const { c, mode } = usePalette();
  return (
    <View testID={testID} style={[{
      backgroundColor: c.surfaceSecondary,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.lg,
      shadowColor: c.shadow,
      shadowOpacity: mode === "dark" ? 0.4 : 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    }, style]}>{children}</View>
  );
}

export function PrimaryButton({ title, onPress, disabled, testID, style }: { title: string; onPress: () => void; disabled?: boolean; testID?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      testID={testID}
      onPress={() => { if (disabled) return; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={({ pressed }) => [{ borderRadius: radius.pill, overflow: "hidden", opacity: disabled ? 0.5 : pressed ? 0.9 : 1 }, style]}
    >
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ paddingVertical: 16, paddingHorizontal: 24, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 }}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress, testID, style }: { title: string; onPress: () => void; testID?: string; style?: StyleProp<ViewStyle> }) {
  const { c } = usePalette();
  return (
    <Pressable testID={testID} onPress={onPress}
      style={({ pressed }) => [{
        borderRadius: radius.pill, paddingVertical: 14, paddingHorizontal: 22,
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: c.borderStrong,
        backgroundColor: c.surfaceSecondary, opacity: pressed ? 0.8 : 1,
      }, style]}>
      <Text style={{ color: c.onSurface, fontSize: 15, fontWeight: "600" }}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, testID }: { label: string; selected?: boolean; onPress: () => void; testID?: string }) {
  const { c } = usePalette();
  return (
    <Pressable testID={testID} onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={{
        paddingHorizontal: 14, height: 36, alignItems: "center", justifyContent: "center",
        borderRadius: radius.pill, borderWidth: 1,
        borderColor: selected ? c.brandPrimary : c.border,
        backgroundColor: selected ? c.brandTertiary : c.surfaceSecondary,
        flexShrink: 0,
      }}>
      <Text style={{ color: selected ? c.onBrandTertiary : c.onSurfaceSecondary, fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value, height = 8, color }: { value: number; height?: number; color?: string }) {
  const { c } = usePalette();
  const v = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, backgroundColor: c.surfaceTertiary, borderRadius: radius.pill, overflow: "hidden" }}>
      <LinearGradient
        colors={color ? [color, color] as any : gradients.brand}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ height: "100%", width: `${v * 100}%`, borderRadius: radius.pill }}
      />
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  center: { alignItems: "center", justifyContent: "center" },
});
