import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { api, session, syncSales } from "../services/api.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(session.user());
  const [loading, setLoading] = useState(Boolean(session.token() && navigator.onLine));

  useEffect(() => {
    let active = true;
    if (!session.token() || !navigator.onLine) {
      setLoading(false);
      return () => { active = false; };
    }
    api("/auth/me").then(({ user: current }) => {
      if (active) { session.saveUser(current); setUser(current); }
    }).catch((error) => {
      if (active && error.status === 401) { session.clear(); setUser(null); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const online = () => syncSales().catch((error) => console.error("Queued sales could not sync:", error));
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, []);

  const signIn = useCallback((data) => { session.save(data); setUser(data.user); }, []);
  const signOut = useCallback(() => { session.clear(); setUser(null); }, []);
  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
