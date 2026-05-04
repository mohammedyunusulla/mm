import { mockApi } from "./mock-data";

// ── Configuration ──────────────────────────────────────────────
// Set NEXT_PUBLIC_USE_MOCK=false and provide NEXT_PUBLIC_API_URL
// in .env.local when connecting to the real backend.
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ── Real API fetch (used when backend is connected) ────────────
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("token");
    window.location.href = "/login";
    return { success: false, error: "Unauthorized" };
  }

  return res.json() as Promise<{ success: boolean; data?: T; error?: string }>;
}

// ── Public API (delegates to mock or real) ─────────────────────
export const api = USE_MOCK
  ? {
      // Auth
      login: mockApi.login,
      getMe: mockApi.getMe,
      // Clients
      getClients: mockApi.getClients,
      getClient: mockApi.getClient,
      createClient: mockApi.createClient,
      updateClient: mockApi.updateClient,
      deleteClient: mockApi.deleteClient,
      addAdvancePayment: mockApi.addAdvancePayment,
      getAdvancePayments: mockApi.getAdvancePayments,
      updateAdvancePayment: mockApi.updateAdvancePayment,
      deleteAdvancePayment: mockApi.deleteAdvancePayment,
      // Transactions
      getTransactions: mockApi.getTransactions,
      createTransaction: mockApi.createTransaction,
      updateTransaction: (_id: string, _data: Record<string, unknown>) =>
        Promise.resolve({ success: false, error: "Mock: not implemented" }),
      deleteTransaction: (_id: string) =>
        Promise.resolve({ success: false, error: "Mock: not implemented" }),
      // Client images
      uploadClientImage: (_id: string, _file: File) =>
        Promise.resolve({ success: false, error: "Mock: not implemented" }),
      deleteClientImage: (_id: string) =>
        Promise.resolve({ success: false, error: "Mock: not implemented" }),
      // Expenses
      getExpenses: mockApi.getExpenses,
      createExpense: mockApi.createExpense,
      deleteExpense: mockApi.deleteExpense,
      // Reports
      getDashboard: mockApi.getDashboard,
      getSummary: mockApi.getSummary,
    }
  : {
      // Auth
      login: (email: string, password: string, tenantSlug: string) =>
        fetchApi("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password, tenantSlug }),
        }),
      getMe: () => fetchApi("/api/auth/me"),
      // Clients
      getClients: (type?: string, search?: string) => {
        const params = new URLSearchParams();
        if (type) params.set("type", type);
        if (search) params.set("search", search);
        return fetchApi(`/api/clients?${params}`);
      },
      getClient: (id: string) => fetchApi(`/api/clients/${encodeURIComponent(id)}`),
      createClient: (data: Record<string, unknown>) =>
        fetchApi("/api/clients", { method: "POST", body: JSON.stringify(data) }),
      updateClient: (id: string, data: Record<string, unknown>) =>
        fetchApi(`/api/clients/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }),
      deleteClient: (id: string) =>
        fetchApi(`/api/clients/${encodeURIComponent(id)}`, { method: "DELETE" }),
      uploadClientImage: async (id: string, file: File) => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const formData = new FormData();
        formData.append("image", file);
        const res = await fetch(`${API_URL}/api/clients/${encodeURIComponent(id)}/image`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        return res.json();
      },
      deleteClientImage: (id: string) =>
        fetchApi(`/api/clients/${encodeURIComponent(id)}/image`, { method: "DELETE" }),
      addAdvancePayment: (clientId: string, amount: number, note?: string, date?: string) =>
        fetchApi(`/api/clients/${encodeURIComponent(clientId)}/advance`, {
          method: "POST",
          body: JSON.stringify({ amount, note, date }),
        }),
      getAdvancePayments: (clientId: string, from?: string, to?: string) => {
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        return fetchApi(`/api/clients/${encodeURIComponent(clientId)}/advance?${params}`);
      },
      updateAdvancePayment: (id: string, data: { amount?: number; note?: string; date?: string }) =>
        fetchApi(`/api/advance/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }),
      deleteAdvancePayment: (id: string) =>
        fetchApi(`/api/advance/${encodeURIComponent(id)}`, { method: "DELETE" }),
      // Transactions
      getTransactions: (type?: string, clientId?: string, from?: string, to?: string) => {
        const params = new URLSearchParams();
        if (type) params.set("type", type);
        if (clientId) params.set("clientId", clientId);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        return fetchApi(`/api/transactions?${params}`);
      },
      createTransaction: (data: Record<string, unknown>) =>
        fetchApi("/api/transactions", { method: "POST", body: JSON.stringify(data) }),
      updateTransaction: (id: string, data: Record<string, unknown>) =>
        fetchApi(`/api/transactions/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }),
      deleteTransaction: (id: string) =>
        fetchApi(`/api/transactions/${encodeURIComponent(id)}`, { method: "DELETE" }),
      // Expenses
      getExpenses: (category?: string, from?: string, to?: string) => {
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        return fetchApi(`/api/expenses?${params}`);
      },
      createExpense: (data: Record<string, unknown>) =>
        fetchApi("/api/expenses", { method: "POST", body: JSON.stringify(data) }),
      deleteExpense: (id: string) =>
        fetchApi(`/api/expenses/${encodeURIComponent(id)}`, { method: "DELETE" }),
      // Reports
      getDashboard: (from?: string, to?: string) => {
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        return fetchApi(`/api/reports/dashboard?${params}`);
      },
      getSummary: (from?: string, to?: string) => {
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        return fetchApi(`/api/reports/summary?${params}`);
      },
    };
