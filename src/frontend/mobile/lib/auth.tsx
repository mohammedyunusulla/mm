import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, useSegments } from "expo-router";
import { api, getToken, setToken, removeToken, saveTenantSlug } from "./api";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isLoading: boolean;
  login: (email: string, password: string, tenantSlug: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  tenant: null,
  isLoading: true,
  login: async () => null,
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // Check for existing token on mount
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        const res = await api.getMe();
        if (res.success && res.data) {
          setUser(res.data as User);
          // Tenant info isn't returned by /me, but user is authenticated
        } else {
          await removeToken();
        }
      }
      setIsLoading(false);
    })();
  }, []);

  // Redirect based on auth state
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "login";
    if (!user && !inAuthGroup) {
      router.replace("/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)/dashboard");
    }
  }, [user, segments, isLoading]);

  const login = async (identifier: string, password: string, tenantSlug: string): Promise<string | null> => {
    const res = await api.login(identifier, password, tenantSlug);
    if (res.success && res.data) {
      await setToken(res.data.token);
      await saveTenantSlug(tenantSlug);
      setUser(res.data.user as User);
      setTenant(res.data.tenant as Tenant);
      return null; // no error
    }
    return res.error || "Login failed";
  };

  const logout = async () => {
    await removeToken();
    setUser(null);
    setTenant(null);
    router.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ user, tenant, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
