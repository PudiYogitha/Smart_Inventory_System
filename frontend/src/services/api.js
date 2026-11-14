const TOKEN_KEY = "stockroom-token";
const USER_KEY = "stockroom-user";
const QUEUE_KEY = "stockroom-sale-queue";
const CACHE_PREFIX = "stockroom-cache:";

export const session = {
  token: () => localStorage.getItem(TOKEN_KEY),
  user: () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
  },
  save(data) {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  },
  saveUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

export async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (session.token()) headers.Authorization = `Bearer ${session.token()}`;
  const response = await fetch(`/api${path}`, { ...options, headers });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const error = new Error(body?.error || "Something went wrong.");
    error.status = response.status;
    throw error;
  }
  if ((!options.method || options.method === "GET") && body) {
    const user = session.user();
    localStorage.setItem(`${CACHE_PREFIX}${user?.businessId || "public"}:${path}`, JSON.stringify(body));
  }
  return body;
}

export async function cachedApi(path) {
  try {
    return await api(path);
  } catch (error) {
    if (error.status) throw error;
    const user = session.user();
    const cached = localStorage.getItem(`${CACHE_PREFIX}${user?.businessId || "public"}:${path}`);
    if (cached) return JSON.parse(cached);
    throw error;
  }
}

export function queuedSales() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
}

export function queueSale(sale) {
  const queue = queuedSales();
  queue.push(sale);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function syncSales() {
  if (!navigator.onLine || !session.token()) return;
  const queue = queuedSales();
  for (let index = 0; index < queue.length; index += 100) {
    const batch = queue.slice(index, index + 100);
    const result = await api("/sales/sync", { method: "POST", body: JSON.stringify({ sales: batch }) });
    const synced = new Set(result.results.filter((item) => item.status === "synced").map((item) => item.idempotencyKey));
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queuedSales().filter((sale) => !synced.has(sale.idempotencyKey))));
    const failed = result.results.filter((item) => item.status !== "synced");
    if (failed.length) window.dispatchEvent(new CustomEvent("stockroom:toast", {
      detail: `${failed.length} queued sale${failed.length === 1 ? "" : "s"} need attention: ${failed[0].error}`
    }));
  }
  window.dispatchEvent(new Event("stockroom:sync"));
}

export const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value) || 0);
export const formatDate = (value, options = { month: "short", day: "numeric" }) => new Intl.DateTimeFormat(undefined, options).format(new Date(value));
export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);
