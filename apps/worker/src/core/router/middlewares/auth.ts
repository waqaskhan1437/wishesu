import { verifyToken } from "../../security/tokens";

export async function tokenAuth(ctx: any, next: any) {
  const h = ctx.req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (token) {
    try {
      const claims = await verifyToken(ctx.env.TOKEN_SECRET, token);
      ctx.user = { id: claims.id, role: claims.role, email: claims.email };
    } catch {
      // ignore invalid token
    }
  }
  return next();
}

export async function requireAuth(ctx: any, next: any) {
  if (!ctx.user) return ctx.json({ ok: false, error: "UNAUTHORIZED" }, 401);
  return next();
}
