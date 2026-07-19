import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePalette } from "@/src/theme";

export default function TabsLayout() {
  const { c, mode } = usePalette();
  const insets = useSafeAreaInsets();
  // Ensure a visible resting area at the bottom on all Android/iOS devices
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 12 : 20);
  const tabBarHeight = 60 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.brandPrimary,
        tabBarInactiveTintColor: c.onSurfaceTertiary,
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: 0,
          backgroundColor: "transparent",
          elevation: 0,
          height: tabBarHeight,
          paddingBottom: bottomInset,
          paddingTop: 8,
        },
        tabBarBackground: () => (
          <BlurView
            tint={mode === "dark" ? "dark" : "light"}
            intensity={mode === "dark" ? 60 : 80}
            style={[
              StyleSheet.absoluteFill,
              {
                borderTopWidth: 1,
                borderTopColor: c.glassBorder,
                backgroundColor: mode === "dark"
                  ? "rgba(11,12,16,0.85)"
                  : "rgba(255,255,255,0.9)",
              },
            ]}
          />
        ),
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
      }} />
      <Tabs.Screen name="roadmap" options={{
        title: "Roadmap", tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
      }} />
      <Tabs.Screen name="coach" options={{
        title: "Coach", tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" size={size} color={color} />,
      }} />
      <Tabs.Screen name="progress" options={{
        title: "Progress", tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
