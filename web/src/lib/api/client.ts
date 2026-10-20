import { z } from "zod";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.API_INTERNAL_BASE ??
  "http://localhost:8081/api/v1";

/** Fired on window when a signed-in request is still 401 after a token refresh. */
export const SESSION_EXPIRED_EVENT = "studyloop:session-expired";

export const EmptyResponseSchema = z.void().or(z.undefined()).or(z.null());

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export class SchemaParseError extends Error {
  constructor(public issues: z.ZodIssue[]) {
    super("Response schema mismatch");
  }
}

export async function apiFetch<S extends z.ZodTypeAny>(
  path: string,
  init: RequestInit & { schema: S; token?: string },
): Promise<z.output<S>> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  let res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  // Access tokens live 15 minutes: on 401 swap the refresh token for a new pair and retry once.
  if (res.status === 401 && init.token) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      headers.set("Authorization", `Bearer ${fresh}`);
      res = await fetch(`${API_BASE}${path}`, { ...init, headers });
    }
    // Still unauthorised: the session is over. The app shell listens and sends the user to sign in.
    if (res.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
  }
  if (!res.ok) {
    let code = "INTERNAL_ERROR";
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { code?: string; detail?: string };
      code = body.code ?? code;
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, code, detail);
  }
  // Spring void endpoints often return 200/202 with an empty body (not only 204).
  if (res.status === 204 || res.status === 205) {
    return parseResponse(init.schema, undefined, path);
  }
  const text = await res.text();
  if (!text) {
    return parseResponse(init.schema, undefined, path);
  }
  const json = JSON.parse(text) as unknown;
  return parseResponse(init.schema, json, path);
}

let refreshing: Promise<string | null> | null = null;

/** Single-flight refresh shared by concurrent requests. Returns the new access token, or null. */
function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const refreshToken = sessionStorage.getItem("refreshToken");
  if (!refreshToken) return Promise.resolve(null);
  refreshing ??= (async () => {
    try {
      const r = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!r.ok) return null;
      const body = (await r.json()) as { accessToken?: string; refreshToken?: string };
      if (!body.accessToken) return null;
      sessionStorage.setItem("accessToken", body.accessToken);
      if (body.refreshToken) sessionStorage.setItem("refreshToken", body.refreshToken);
      return body.accessToken;
    } catch {
      return null;
    } finally {
      setTimeout(() => {
        refreshing = null;
      }, 0);
    }
  })();
  return refreshing;
}

function parseResponse<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
  path: string,
): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    if (process.env.NODE_ENV === "development") {
      console.error("apiFetch schema mismatch", path, result.error.issues);
    }
    throw new SchemaParseError(result.error.issues);
  }
  return result.data;
}
