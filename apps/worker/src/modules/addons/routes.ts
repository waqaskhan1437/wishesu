import { requireAuth } from "../../core/router/middlewares/auth";
import { requireRole } from "../../core/router/middlewares/rbac";
import { requireJson } from "../../core/router/middlewares/validate";

export const AddonsModule = {
  mount(router: any, c: any) {
    const service = c.get<any>("addons.service");

    router.get(
      "/admin/products/:id/addons",
      requireAuth,
      requireRole(["owner", "admin", "editor", "viewer"]),
      async (ctx: any) => {
        const items = await service.list(ctx.params.id);
        return ctx.json({ ok: true, data: items });
      }
    );

    router.post(
      "/admin/products/:id/addons",
      requireAuth,
      requireRole(["owner", "admin", "editor"]),
      requireJson,
      async (ctx: any) => {
        const body = await ctx.req.json();
        const out = await service.add(ctx.params.id, body);
        return ctx.json({ ok: true, data: out });
      }
    );
  },
};
