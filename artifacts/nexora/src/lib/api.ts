const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const API_BASE = `${BASE}/api`;

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("nexora_token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> ?? {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}
