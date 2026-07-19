import { useColorScheme } from "react-native";

export type ThemeMode = "light" | "dark";

export const palette = {
  light: {
    surface: "#FFFFFF",
    onSurface: "#0F1115",
    surfaceSecondary: "#F1F5F9",
    onSurfaceSecondary: "#334155",
    surfaceTertiary: "#E2E8F0",
    onSurfaceTertiary: "#475569",
    brand: "#6366F1",
    brandPrimary: "#7C3AED",
    onBrandPrimary: "#FFFFFF",
    brandSecondary: "#3B82F6",
    onBrandSecondary: "#FFFFFF",
    brandTertiary: "#EDE9FE",
    onBrandTertiary: "#5B21B6",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#0EA5E9",
    border: "#E2E8F0",
    borderStrong: "#CBD5E1",
    divider: "#F1F5F9",
    glass: "rgba(255,255,255,0.6)",
    glassBorder: "rgba(15,17,21,0.08)",
    shadow: "#0F1115",
  },
  dark: {
    surface: "#0B0C10",
    onSurface: "#F8FAFC",
    surfaceSecondary: "#161821",
    onSurfaceSecondary: "#CBD5E1",
    surfaceTertiary: "#202330",
    onSurfaceTertiary: "#94A3B8",
    brand: "#818CF8",
    brandPrimary: "#A78BFA",
    onBrandPrimary: "#FFFFFF",
    brandSecondary: "#60A5FA",
    onBrandSecondary: "#FFFFFF",
    brandTertiary: "#3B2669",
    onBrandTertiary: "#DDD6FE",
    success: "#059669",
    warning: "#D97706",
    error: "#DC2626",
    info: "#0284C7",
    border: "#2A2D3D",
    borderStrong: "#3F445B",
    divider: "#1E212E",
    glass: "rgba(255,255,255,0.06)",
    glassBorder: "rgba(255,255,255,0.12)",
    shadow: "#000000",
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 8, md: 16, lg: 24, pill: 999 };

export function usePalette(override?: ThemeMode) {
  const sys = useColorScheme();
  const mode: ThemeMode = override ?? (sys === "light" ? "light" : "dark");
  return { c: palette[mode], mode };
}

export const gradients = {
  brand: ["#7C3AED", "#3B82F6"] as const,
  brandVivid: ["#A78BFA", "#60A5FA"] as const,
  sunrise: ["#F59E0B", "#EC4899"] as const,
  success: ["#10B981", "#3B82F6"] as const,
};
