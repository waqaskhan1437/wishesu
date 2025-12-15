import { requireAuth } from "../../core/router/middlewares/auth";
import { requireRole } from "../../core/router/middlewares/rbac";

export const MediaModule = {
  mount(router: any, c: any) {
    const service = c.get<any>("media.service");

    router.get(
      "/admin/products/:id/media",
      requireAuth,
      requireRole(["owner", "admin", "editor", "viewer"]),
      async (ctx: any) => {
        const productId = ctx.params.id;
        const items = await service.list(productId);
        return ctx.json({ ok: true, data: items });
      }
    );

    router.post(
      "/admin/products/:id/media",
      requireAuth,
      requireRole(["owner", "admin", "editor"]),
      async (ctx: any) => {
        const productId = ctx.params.id;
        const form = await ctx.req.formData();
        const file = form.get("file");
        const kind = (form.get("kind") || "image") as "image" | "video";
        const alt = (form.get("alt") || "") as string;

        if (!(file instanceof File)) return ctx.json({ ok: false, error: "FILE_REQUIRED" }, 400);
        const out = await service.upload(productId, file, kind, alt);
        return ctx.json({ ok: true, data: out });
      }
    );
  },
};
