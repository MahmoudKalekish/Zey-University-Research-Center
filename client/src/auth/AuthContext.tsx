import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError, api } from "../services/api";
type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "RESEARCHER" | "VISITOR";
};
type Ctx = {
  user?: User;
  loading: boolean;
  login: (e: string, p: string) => Promise<void>;
  register: (x: any) => Promise<void>;
  logout: () => void;
};
const C = createContext<Ctx>(null as any);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const expire = () => setUser(undefined);
    window.addEventListener("auth:expired", expire);
    if (!localStorage.getItem("token")) setLoading(false);
    else
      api<User>("/auth/me")
        .then(setUser)
        .catch(() => localStorage.removeItem("token"))
        .finally(() => setLoading(false));
    return () => window.removeEventListener("auth:expired", expire);
  }, []);
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let refreshing = false;
    const refresh = async () => {
      const token = localStorage.getItem("token");
      if (!token || refreshing || document.visibilityState === "hidden") return;
      refreshing = true;
      try {
        const updated = await api<User>("/auth/me");
        if (cancelled || localStorage.getItem("token") !== token) return;
        setUser((current) => {
          if (current?.id !== userId) return current;
          return current.role === updated.role &&
            current.email === updated.email &&
            current.firstName === updated.firstName &&
            current.lastName === updated.lastName
            ? current
            : updated;
        });
      } catch (error) {
        if (
          !cancelled &&
          localStorage.getItem("token") === token &&
          error instanceof ApiError &&
          error.status === 403
        ) {
          localStorage.removeItem("token");
          setUser(undefined);
        }
      } finally {
        refreshing = false;
      }
    };
    const timer = window.setInterval(() => void refresh(), 15000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [userId]);
  async function auth(path: string, data: any) {
    const r = await api<{ token: string; user: User }>(path, {
      method: "POST",
      body: JSON.stringify(data),
    });
    localStorage.setItem("token", r.token);
    setUser(r.user);
  }
  return (
    <C.Provider
      value={{
        user,
        loading,
        login: (email, password) => auth("/auth/login", { email, password }),
        register: (x) => auth("/auth/register", x),
        logout: () => {
          localStorage.removeItem("token");
          setUser(undefined);
        },
      }}
    >
      {children}
    </C.Provider>
  );
}
export const useAuth = () => useContext(C);
