import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  initialized: boolean;
}

interface AuthContextValue extends AuthState {
  register: (email: string, password: string, displayName: string) => Promise<AuthUser>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const STORAGE_KEY = "typeracer.auth";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    initialized: false,
  });

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setState((s) => ({ ...s, initialized: true }));
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { token: string; user: AuthUser };
      api<AuthUser>("/auth/me", { token: parsed.token })
        .then((user) => setState({ token: parsed.token, user, initialized: true }))
        .catch(() => {
          localStorage.removeItem(STORAGE_KEY);
          setState({ token: null, user: null, initialized: true });
        });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setState((s) => ({ ...s, initialized: true }));
    }
  }, []);

  const persist = (token: string, user: AuthUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    setState({ token, user, initialized: true });
  };

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const result = await api<{ token: string; user: AuthUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    });
    persist(result.token, result.user);
    return result.user;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    persist(result.token, result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ token: null, user: null, initialized: true });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, register, login, logout }),
    [state, register, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
