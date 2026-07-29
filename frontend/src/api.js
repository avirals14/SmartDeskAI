const BASE = "/api";
const TOKEN_KEY = "smartdesk_token";

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  health: () => fetch(`${BASE}/health`).then(handle),

  // ---- Auth ----
  signup: (payload) =>
    fetch(`${BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  login: (payload) =>
    fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  me: () => fetch(`${BASE}/auth/me`, { headers: authHeaders() }).then(handle),

  // ---- Tickets ----
  listTickets: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${BASE}/tickets${qs ? `?${qs}` : ""}`, { headers: authHeaders() }).then(handle);
  },

  getTicket: (id) => fetch(`${BASE}/tickets/${id}`, { headers: authHeaders() }).then(handle),

  createTicket: (payload) =>
    fetch(`${BASE}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    }).then(handle),

  updateStatus: (id, status) =>
    fetch(`${BASE}/tickets/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ status }),
    }).then(handle),

  addMessage: (id, payload) =>
    fetch(`${BASE}/tickets/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    }).then(handle),

  // ---- Search ----
  search: (q) => fetch(`${BASE}/search?q=${encodeURIComponent(q)}`, { headers: authHeaders() }).then(handle),

  searchSemantic: (q) =>
    fetch(`${BASE}/search/semantic?q=${encodeURIComponent(q)}`, { headers: authHeaders() }).then(handle),

  // ---- Dashboard ----
  dashboardSummary: () => fetch(`${BASE}/dashboard/summary`, { headers: authHeaders() }).then(handle),
};
