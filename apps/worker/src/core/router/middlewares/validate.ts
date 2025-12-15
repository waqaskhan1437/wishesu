export function requireJson(ctx: any, next: any) {
  const ct = ctx.req.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return ctx.json({ ok: false, error: "CONTENT_TYPE_JSON_REQUIRED" }, 415);
  }
  return next();
}
