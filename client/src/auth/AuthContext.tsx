import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "../services/api";
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
