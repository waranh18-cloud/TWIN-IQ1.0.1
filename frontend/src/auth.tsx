import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { api, setToken, getToken } from "./api";

type User = any;

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(Ctx);
}

function parseSessionId(url: string): string | null {
  try {
    const u = new URL(url);
    const hash = u.hash?.replace(/^#/, "");
    if (hash) {
      const p = new URLSearchParams(hash);
      const sid = p.get("session_id");
      if (sid) return sid;
    }
    return u.searchParams.get("session_id");
  } catch {
    const m = url.match(/session_id=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const processSessionId = useCallback(async (sid: string) => {
    const res = await api.createSession(sid);
    await setToken(res.session_token);
    setUser(res.user);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const r = await api.me();
      setUser(r.user);
    } catch {
      await setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      // On web, check URL for session_id first
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const sid = parseSessionId(window.location.href);
        if (sid) {
          try {
            await processSessionId(sid);
            window.history.replaceState(null, "", window.location.pathname);
          } catch {}
          setLoading(false);
          return;
        }
      } else {
        const initUrl = await Linking.getInitialURL();
        if (initUrl) {
          const sid = parseSessionId(initUrl);
          if (sid) {
            try {
              await processSessionId(sid);
            } catch {}
            setLoading(false);
            return;
          }
        }
      }
      await refreshUser();
      setLoading(false);
    })();

    const sub = Linking.addEventListener("url", async ({ url }) => {
      const sid = parseSessionId(url);
      if (sid) {
        try { await processSessionId(sid); } catch {}
      }
    });
    return () => sub.remove();
  }, [processSessionId, refreshUser]);

  const signInWithGoogle = async () => {
    const redirectUrl =
      Platform.OS === "web"
        ? (typeof window !== "undefined" ? window.location.origin + "/" : "/")
        : Linking.createURL("");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = authUrl;
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    if (result.type === "success" && result.url) {
      const sid = parseSessionId(result.url);
      if (sid) await processSessionId(sid);
    }
  };

  const signOut = async () => {
    try { await api.logout(); } catch {}
    await setToken(null);
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, signInWithGoogle, signOut, refreshUser }}>
      {children}
    </Ctx.Provider>
  );
}
