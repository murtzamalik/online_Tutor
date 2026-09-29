import { z } from "zod";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.API_INTERNAL_BASE ??
  "http://localhost:8081/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { schema: z.ZodType<T>; token?: string },
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
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
  if (res.status === 204) return init.schema.parse(undefined);
  const json = await res.json();
  return init.schema.parse(json);
}
