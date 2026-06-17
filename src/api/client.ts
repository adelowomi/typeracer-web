export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5085";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface Options extends RequestInit {
  token?: string | null;
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const { token, headers, ...rest } = opts;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text.length ? JSON.parse(text) : null;
  } catch {
    // leave as text
  }
  if (!res.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: unknown }).error)
        : text || `Request failed: ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return body as T;
}
