const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const token = localStorage.getItem("cybershield_token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = "Request failed";
    try {
      const payload = await response.json();
      detail = payload.detail || detail;
    } catch {
      detail = response.statusText || detail;
    }
    throw new Error(detail);
  }

  if (options.raw) return response;
  return response.json();
}

export const api = {
  signup: (payload) =>
    request("/api/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/api/auth/me"),
  scan: (payload) =>
    request("/api/scan/predict", { method: "POST", body: JSON.stringify(payload) }),
  scanUrl: (url) =>
    request("/api/scan/url", { method: "POST", body: JSON.stringify({ url }) }),
  history: () => request("/api/scan/history"),
  analytics: () => request("/api/analytics/summary"),
  alerts: () => request("/api/alerts"),
  simulateScanner: () => request("/api/scanner/simulate", { method: "POST" }),
  reportUrl: (scanId) => `${API_BASE}/api/scan/${scanId}/report`,
};

