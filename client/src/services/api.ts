const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export async function api<T>(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...((token ? { authorization: `Bearer ${token}` } : {}) as any),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Unable to connect to the server. Check that the backend is running and try again.",
      0,
    );
  }
  if (!response.ok) {
    const e = await response.json().catch(() => ({}));
    if (response.status === 401 && token) {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("auth:expired"));
    }
    throw new ApiError(
      e.message ||
        (response.status >= 500
          ? "The service is temporarily unavailable. Please try again."
          : "The request could not be completed."),
      response.status,
      e.errors || {},
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
