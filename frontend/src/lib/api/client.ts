// Empty string (not an absolute URL) is the correct default: it makes every
// request relative to whatever origin the page was loaded from, so the same
// build works behind the LAN IP, the Cloudflare tunnel, or any future domain
// without needing to know the origin ahead of time. Only local dev sets this
// explicitly (to the backend's own port, since it isn't proxied to :3000).
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> },
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Zod validation failures come back as { formErrors, fieldErrors } — surface
// the actual per-field messages instead of the generic "Validation failed"
// summary, which tells the user nothing about what to fix.
export function describeApiError(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  const fieldMessages = Object.values(err.details?.fieldErrors ?? {}).flat();
  if (fieldMessages.length > 0) return fieldMessages.join(" · ");
  return err.message || fallback;
}

type RefreshHandler = () => Promise<string | null>;

let accessToken: string | null = null;
let refreshHandler: RefreshHandler | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setRefreshHandler(handler: RefreshHandler | null) {
  refreshHandler = handler;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Attach the access token and retry once via the refresh handler on 401. Defaults to true. */
  auth?: boolean;
}

async function rawRequest(path: string, options: RequestOptions, token: string | null) {
  const isFormData = options.body instanceof FormData;
  return fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      // Let the browser set multipart/form-data with its own boundary for FormData bodies.
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.auth !== false && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body === undefined ? undefined : isFormData ? (options.body as FormData) : JSON.stringify(options.body),
  });
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await rawRequest(path, options, accessToken);

  if (res.status === 401 && options.auth !== false && refreshHandler) {
    const newToken = await refreshHandler();
    if (newToken) {
      res = await rawRequest(path, options, newToken);
    }
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, data?.error?.message ?? "İstek başarısız oldu", data?.error?.code, data?.error?.details);
  }

  return data as T;
}
