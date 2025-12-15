export type Role = "owner" | "admin" | "editor" | "viewer";

export function requireRole(allowed: Role[]) {
  return async (ctx: any, next: any) => {
    const role = (ctx.user?.role ?? "") as Role;
    if (!role || !allowed.includes(role)) {
      return ctx.json({ ok: false, error: "FORBIDDEN" }, 403);
    }
    return next();
  };
}
