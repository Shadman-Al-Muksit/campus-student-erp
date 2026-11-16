import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api, post, errorText, ApiError } from "./lib/api";
import type { User } from "./lib/types";
type State = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  mode: "basic" | "enhanced";
  setMode: (mode: "basic" | "enhanced") => void;
  notify: (message: string, error?: boolean) => void;
};
const Context = createContext<State | null>(null);
export const useApp = () => {
  const state = useContext(Context);
  if (!state) throw Error("Missing application provider");
  return state;
};
export function AppProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const { t } = useTranslation();
  const auth = useQuery({
    queryKey: ["auth"],
    queryFn: () => api<{ user: User }>("auth/me/"),
    retry: false,
    staleTime: 5 * 60_000,
  });
  useEffect(() => {
    const expire = () => {
      client.setQueryData(["auth"], { user: null });
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== "auth",
      });
    };
    window.addEventListener("campus-session-expired", expire);
    return () => window.removeEventListener("campus-session-expired", expire);
  }, [client]);
  const [mode, setModeState] = useState<"basic" | "enhanced">(() =>
    localStorage.getItem("campus-view") === "basic" ? "basic" : "enhanced",
  );
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(id);
  }, [toast]);
  const setMode = (value: "basic" | "enhanced") => {
    setModeState(value);
    localStorage.setItem("campus-view", value);
  };
  const login = async (username: string, password: string) => {
    const data = await post<{ user: User }>("auth/login/", {
      username,
      password,
    });
    client.setQueryData(["auth"], data);
    client.removeQueries({
      predicate: (query) => query.queryKey[0] !== "auth",
    });
    return data.user;
  };
  const logout = async () => {
    try {
      await post("auth/logout/");
    } catch (e) {
      if (!(e instanceof ApiError && [401, 403].includes(e.status))) {
        setToast({ message: errorText(e), error: true });
        throw e;
      }
    }
    client.setQueryData(["auth"], { user: null });
    client.removeQueries({
      predicate: (query) => query.queryKey[0] !== "auth",
    });
  };
  return (
    <Context.Provider
      value={{
        user: auth.data?.user || null,
        loading: auth.isPending,
        login,
        logout,
        mode,
        setMode,
        notify: (message, error = false) => setToast({ message, error }),
      }}
    >
      {children}
      {toast && (
        <div
          className={`toast ${toast.error ? "toast-error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.message}
          <button onClick={() => setToast(null)} aria-label={t("close")}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
