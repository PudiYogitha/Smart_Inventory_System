const TOKEN = "stockroom-token";
const USER = "stockroom-user";
const QUEUE = "stockroom-sale-queue";
const CACHE = "stockroom-cache:";

export const session = {
  token: () => localStorage.getItem(TOKEN),
  user: () => {
    try { return JSON.parse(localStorage.getItem(USER) || "null"); } catch { return null; }
  },
  save(data) {
    localStorage.setItem(TOKEN, data.token);
    localStorage.setItem(USER, JSON.stringify(data.user));
  },
  saveUser(user) { localStorage.setItem(USER, JSON.stringify(user)); },
  clear() { localStorage.removeItem(TOKEN); localStorage.removeItem(USER); }
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
    const businessId = session.user()?.businessId || "public";
    localStorage.setItem(`${CACHE}${businessId}:${path}`, JSON.stringify(body));
  }
  return body;
}

export async function cachedApi(path) {
  try { return await api(path); }
  catch (error) {
    if (error.status) throw error;
    const key = `${CACHE}${session.user()?.businessId || "public"}:${path}`;
    const data = localStorage.getItem(key);
    if (data) return JSON.parse(data);
    throw error;
  }
}

export function queuedSales() {
  try { return JSON.parse(localStorage.getItem(QUEUE) || "[]"); } catch { return []; }
}

export function queueSale(sale) {
  localStorage.setItem(QUEUE, JSON.stringify([...queuedSales(), sale]));
}

export async function syncSales() {
  if (!navigator.onLine || !session.token()) return;
  const queued = queuedSales();
  for (let index = 0; index < queued.length; index += 100) {
    const batch = queued.slice(index, index + 100);
    const { results } = await api("/sales/sync", { method: "POST", body: JSON.stringify({ sales: batch }) });
    const synced = new Set(results.filter((item) => item.status === "synced").map((item) => item.idempotencyKey));
    localStorage.setItem(QUEUE, JSON.stringify(queuedSales().filter((sale) => !synced.has(sale.idempotencyKey))));
    const failures = results.filter((item) => item.status !== "synced");
    if (failures.length) notify(`${failures.length} queued sale(s) need attention: ${failures[0].error}`);
  }
  window.dispatchEvent(new Event("stockroom:sync"));
}

export function notify(message) {
  window.dispatchEvent(new CustomEvent("stockroom:toast", { detail: message }));
}

export const money = (value) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(value) || 0);
export const date = (value, options = { month: "short", day: "numeric" }) => new Intl.DateTimeFormat(undefined, options).format(new Date(value));
