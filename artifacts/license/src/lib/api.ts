const BASE = "/api/lic";

export function getToken(): string | null {
  return localStorage.getItem("lic_token");
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem("lic_token", t);
  else localStorage.removeItem("lic_token");
}
export function getTokenPayload(): { id: number; email: string; role: string } | null {
  const t = getToken();
  if (!t) return null;
  try { return JSON.parse(atob(t.split(".")[1])); } catch { return null; }
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}
