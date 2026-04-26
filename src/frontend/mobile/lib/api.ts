import * as SecureStore from "expo-secure-store";

// ── Configuration ──────────────────────────────────────────────
// For local development, use your machine's LAN IP or 10.0.2.2 for Android emulator
const API_URL = __DEV__
  ? "http://10.0.2.2:4000" // Android emulator → host machine
  : "https://api.yourserver.com";

// Allow overriding at runtime (set before login)
let _apiUrl = API_URL;
export function setApiUrl(url: string) {
  _apiUrl = url;
}
export function getApiUrl() {
  return _apiUrl;
}

// ── Token Management ───────────────────────────────────────────
const TOKEN_KEY = "mandi_token";
const TENANT_KEY = "mandi_tenant_slug";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function saveTenantSlug(slug: string): Promise<void> {
  await SecureStore.setItemAsync(TENANT_KEY, slug);
}

export async function getSavedTenantSlug(): Promise<string | null> {
  return SecureStore.getItemAsync(TENANT_KEY);
}

// ── Generic Fetch ──────────────────────────────────────────────
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = await getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${_apiUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      await removeToken();
      return { success: false, error: "Session expired" };
    }

    return (await res.json()) as { success: boolean; data?: T; error?: string };
  } catch {
    return { success: false, error: "Network error. Check your connection." };
  }
}

// ── Auth ───────────────────────────────────────────────────────
export const api = {
  login: (identifier: string, password: string, tenantSlug: string) =>
    fetchApi<{ token: string; user: { id: string; name: string; email: string; role: string }; tenant: { id: string; name: string; slug: string } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ identifier, password, tenantSlug }) }
    ),

  getMe: () =>
    fetchApi<{ id: string; name: string; email: string; role: string }>("/api/auth/me"),

  // ── Clients ────────────────────────────────────────────────
  getClients: (type?: string, search?: string) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (search) params.set("search", search);
    return fetchApi<unknown[]>(`/api/clients?${params}`);
  },

  getClient: (id: string) =>
    fetchApi<unknown>(`/api/clients/${encodeURIComponent(id)}`),

  createClient: (data: Record<string, unknown>) =>
    fetchApi<unknown>("/api/clients", { method: "POST", body: JSON.stringify(data) }),

  updateClient: (id: string, data: Record<string, unknown>) =>
    fetchApi<unknown>(`/api/clients/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteClient: (id: string) =>
    fetchApi<unknown>(`/api/clients/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // ── Advance Payments ───────────────────────────────────────
  addAdvancePayment: (clientId: string, amount: number, note?: string) =>
    fetchApi<unknown>(`/api/clients/${encodeURIComponent(clientId)}/advance`, {
      method: "POST",
      body: JSON.stringify({ amount, note }),
    }),

  getAdvancePayments: (clientId: string) =>
    fetchApi<unknown[]>(`/api/clients/${encodeURIComponent(clientId)}/advance`),

  deleteAdvancePayment: (id: string) =>
    fetchApi<unknown>(`/api/advance/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // ── Transactions ───────────────────────────────────────────
  getTransactions: (type?: string, clientId?: string) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (clientId) params.set("clientId", clientId);
    return fetchApi<unknown[]>(`/api/transactions?${params}`);
  },

  createTransaction: (data: Record<string, unknown>) =>
    fetchApi<unknown>("/api/transactions", { method: "POST", body: JSON.stringify(data) }),

  deleteTransaction: (id: string) =>
    fetchApi<unknown>(`/api/transactions/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // ── Expenses ───────────────────────────────────────────────
  getExpenses: (category?: string) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    return fetchApi<unknown[]>(`/api/expenses?${params}`);
  },

  createExpense: (data: Record<string, unknown>) =>
    fetchApi<unknown>("/api/expenses", { method: "POST", body: JSON.stringify(data) }),

  deleteExpense: (id: string) =>
    fetchApi<unknown>(`/api/expenses/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // ── Reports ────────────────────────────────────────────────
  getDashboard: () =>
    fetchApi<{
      totalBuyers: number;
      totalSellers: number;
      todayPurchases: number;
      todaySales: number;
      todayExpenses: number;
      totalReceivable: number;
      totalPayable: number;
      recentTransactions: unknown[];
    }>("/api/reports/dashboard"),

  getSummary: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return fetchApi<unknown>(`/api/reports/summary?${params}`);
  },
};
