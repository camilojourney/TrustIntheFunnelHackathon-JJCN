import { NextRequest } from "next/server";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const base = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
  const headers = new Headers();
  for (const key of ["content-type", "x-session-id"]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  try {
    const response = await fetch(`${base}/api/${path.map(encodeURIComponent).join("/")}`, {
      method: request.method, headers, cache: "no-store",
      body: request.method === "GET" ? undefined : await request.arrayBuffer(),
      signal: AbortSignal.timeout(30000),
    });
    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return Response.json({ detail: "Backend unavailable. Retry or start the explicit offline demo." }, { status: 503 });
  }
}
export const GET = proxy;
export const POST = proxy;
