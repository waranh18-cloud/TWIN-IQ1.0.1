import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
const API = `${BASE}/api`;
const TOKEN_KEY = "twiniq_session_token";

async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (Platform.OS === "web") {
    try {
      if (token) window.localStorage.setItem(TOKEN_KEY, token);
      else window.localStorage.removeItem(TOKEN_KEY);
    } catch {}
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function req(method: string, path: string, body?: any): Promise<any> {
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  createSession: (session_id: string) => req("POST", "/auth/session", { session_id }),
  me: () => req("GET", "/auth/me"),
  logout: () => req("POST", "/auth/logout"),
  onboardingQuestions: () => req("GET", "/onboarding/questions"),
  completeOnboarding: (answers: any[]) => req("POST", "/onboarding/complete", { answers }),
  dashboard: () => req("GET", "/dashboard"),
  roadmap: () => req("GET", "/roadmap"),
  regenRoadmap: () => req("POST", "/roadmap/regenerate"),
  completeMission: (mission_id: string) => req("POST", "/missions/complete", { mission_id }),
  checkin: (data: any) => req("POST", "/checkin", data),
  checkinToday: () => req("GET", "/checkin/today"),
  coachHistory: () => req("GET", "/coach/history"),
  coachSend: (message: string) => req("POST", "/coach/message", { message }),
  weeklyReport: () => req("GET", "/reports/weekly"),
  weeklyChallenge: () => req("GET", "/challenges/weekly"),
  useFreeze: () => req("POST", "/streak/use-freeze", {}),
  pomodoroSession: (duration_min: number, kind: "focus" | "break", mission_id?: string) =>
    req("POST", "/pomodoro/session", { duration_min, kind, mission_id }),
  pomodoroStats: () => req("GET", "/pomodoro/stats"),
};

export { getToken };
