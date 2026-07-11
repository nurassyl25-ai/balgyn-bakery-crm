const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("balgyn:token");
}

function toCamel(obj) {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
        toCamel(v),
      ])
    );
  }
  return obj;
}

function toSnake(obj) {
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase()),
        v,
      ])
    );
  }
  return obj;
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("balgyn:token");
    window.dispatchEvent(new Event("balgyn:unauthorized"));
    throw new Error("401 Unauthorized");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${path} failed: ${res.status} ${text}`);
  }
  if (res.status === 204) return null;
  return toCamel(await res.json());
}

export const api = {
  health: () => request("/api/health"),

  login: async (username, password) => {
    const body = new URLSearchParams();
    body.append("username", username);
    body.append("password", password);
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error("Неверный логин или пароль");
    return toCamel(await res.json());
  },
  me: () => request("/api/auth/me"),
  logout: () => localStorage.removeItem("balgyn:token"),
  changePassword: (currentPassword, newPassword) =>
    request("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(toSnake({ currentPassword, newPassword })),
    }),

  getClients: () => request("/api/clients"),
  getOrders: () => request("/api/orders"),
  createOrder: (payload) =>
    request("/api/orders", { method: "POST", body: JSON.stringify(toSnake(payload)) }),
  updateOrder: (id, payload) =>
    request(`/api/orders/${id}`, { method: "PUT", body: JSON.stringify(toSnake(payload)) }),
  deleteOrder: (id) => request(`/api/orders/${id}`, { method: "DELETE" }),
  updateClient: (id, payload) =>
    request(`/api/clients/${id}`, { method: "PUT", body: JSON.stringify(toSnake(payload)) }),
  deleteClient: (id) => request(`/api/clients/${id}`, { method: "DELETE" }),

  getUsers: () => request("/api/users"),
  createUser: (payload) =>
    request("/api/users", { method: "POST", body: JSON.stringify(toSnake(payload)) }),
  updateUser: (id, payload) =>
    request(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(toSnake(payload)) }),
  deleteUser: (id) => request(`/api/users/${id}`, { method: "DELETE" }),
};
