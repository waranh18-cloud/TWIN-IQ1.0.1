import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { usePalette } from "@/src/theme";

export default function TabsLayout() {
  const { c, mode } = usePalette();
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
          height: Platform.OS === "ios" ? 84 : 70,
          paddingBottom: Platform.OS === "ios" ? 24 : 12,
          paddingTop: 10,
        },
        tabBarBackground: () => (
          <BlurView
            tint={mode === "dark" ? "dark" : "light"}
            intensity={mode === "dark" ? 60 : 80}
            style={[StyleSheet.absoluteFill, { borderTopWidth: 1, borderTopColor: c.glassBorder }]}
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
