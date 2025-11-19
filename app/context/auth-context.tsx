"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  tier?: string;
  phone?: string;
  avatar?: string | null;
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
  verification_rejection_reason?: string | null;
}

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateUser: (updater: (prev: UserProfile | null) => UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_STORAGE_KEY = "userData";
const TOKEN_STORAGE_KEY = "authToken";
const DJANGO_API_BASE_URL = process.env.NEXT_PUBLIC_DJANGO_BASE_URL ?? "http://127.0.0.1:8000";

async function fetchProfile(token: string): Promise<UserProfile | null> {
  try {
    const response = await fetch("/api/users/profile", {
      headers: {
        Authorization: `Token ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.profile || null;
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
    const storedUser = typeof window !== "undefined" ? localStorage.getItem(USER_STORAGE_KEY) : null;

    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setLoading(false);
        } catch (error) {
          console.error("Failed to parse stored user data:", error);
          setLoading(false);
        }
      } else {
        fetchProfile(storedToken).then((profile) => {
          if (profile) {
            setUser((prev) => {
              const merged = {
                ...profile,
                avatar: prev?.avatar ?? profile.avatar ?? null,
              } as UserProfile;
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(merged));
              return merged;
            });
          }
          setLoading(false);
        });
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback((newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);

    setUser((prev) => {
      const merged = {
        ...newUser,
        avatar: prev?.avatar ?? newUser.avatar ?? null,
      } as UserProfile;
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  }, []);

  const logout = useCallback(() => {
    const currentToken = token;
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    if (currentToken) {
      fetch(`${DJANGO_API_BASE_URL}/api/auth/logout/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${currentToken}`,
        },
      }).catch((error) => {
        console.error("Logout request failed:", error);
      });
    }
  }, [token]);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    const profile = await fetchProfile(token);
    if (profile) {
      setUser((prev) => {
        const merged = {
          ...profile,
          avatar: prev?.avatar ?? profile.avatar ?? null,
        } as UserProfile;
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });
    }
  }, [token]);

  const updateUser = useCallback((updater: (prev: UserProfile | null) => UserProfile | null) => {
    setUser((prev) => {
      const next = updater(prev);
      if (next) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: Boolean(user && token),
    loading,
    login,
    logout,
    refreshProfile,
    updateUser,
  }), [user, token, loading, login, logout, refreshProfile, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
