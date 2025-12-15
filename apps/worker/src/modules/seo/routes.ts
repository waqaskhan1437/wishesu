import { requireAuth } from "../../core/router/middlewares/auth";
import { requireRole } from "../../core/router/middlewares/rbac";
import { requireJson } from "../../core/router/middlewares/validate";

export const SeoModule = {
  mount(router: any, c: any) {
    const service = c.get<any>("seo.service");

    router.get(
      "/admin/products/:id/seo",
      requireAuth,
      requireRole(["owner", "admin", "editor", "viewer"]),
      async (ctx: any) => {
        const data = await service.get(ctx.params.id);
        return ctx.json({ ok: true, data });
      }
    );

    router.post(
      "/admin/products/:id/seo",
      requireAuth,
      requireRole(["owner", "admin", "editor"]),
      requireJson,
      async (ctx: any) => {
        const body = await ctx.req.json();
        const out = await service.save(ctx.params.id, body);
        return ctx.json({ ok: true, data: out });
      }
    );
  },
};
