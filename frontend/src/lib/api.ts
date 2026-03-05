const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function apiPost<T = unknown>(
  path: string,
  body: unknown,
  token?: string
): Promise<{ ok: boolean; data: T; status: number }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { ok: response.ok, data, status: response.status };
}

export async function apiGet<T = unknown>(
  path: string,
  token?: string
): Promise<{ ok: boolean; data: T; status: number }> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${path}`, { headers });
  const data = await response.json();
  return { ok: response.ok, data, status: response.status };
}

export async function apiPut<T = unknown>(
  path: string,
  body: unknown,
  token?: string
): Promise<{ ok: boolean; data: T; status: number }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { ok: response.ok, data, status: response.status };
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function getGymId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gymId');
}

export function clearAuth(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('gymId');
  localStorage.removeItem('adminId');
}
