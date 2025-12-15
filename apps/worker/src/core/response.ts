export function json(data: any, status = 200, headers?: HeadersInit): Response {
  const h = new Headers(headers);
  h.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { status, headers: h });
}
