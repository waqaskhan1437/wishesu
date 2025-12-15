import { requireAuth } from "../../core/router/middlewares/auth";
import { requireRole } from "../../core/router/middlewares/rbac";
import { requireJson } from "../../core/router/middlewares/validate";

export const ProductsModule = {
  mount(router: any, c: any) {
    const service = c.get<any>("products.service");

    router.post(
      "/admin/products",
      requireAuth,
      requireRole(["owner", "admin", "editor"]),
      requireJson,
      async (ctx: any) => {
        const body = await ctx.req.json();
        const created = await service.create(ctx.user.id, body);
        return ctx.json({ ok: true, data: created });
      }
    );

    router.get(
      "/admin/products/:id",
      requireAuth,
      requireRole(["owner", "admin", "editor", "viewer"]),
      async (ctx: any) => {
        const id = ctx.params.id;
        const data = await service.getById(id);
        return ctx.json({ ok: true, data });
      }
    );
  },
};
