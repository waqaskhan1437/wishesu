import { requireJson } from "../../core/router/middlewares/validate";
import { requireAuth } from "../../core/router/middlewares/auth";

export const AuthModule = {
  mount(router: any, c: any) {
    const service = c.get<any>("auth.service");

    router.post("/setup/owner", requireJson, async (ctx: any) => {
      const body = await ctx.req.json();
      const out = await service.setupOwner(body.email, body.password);
      return ctx.json({ ok: true, data: out });
    });

    router.post("/auth/login", requireJson, async (ctx: any) => {
      const body = await ctx.req.json();
      const out = await service.login(body.email, body.password);
      return ctx.json({ ok: true, data: out });
    });

    router.get("/auth/me", requireAuth, async (ctx: any) => {
      return ctx.json({ ok: true, data: ctx.user });
    });
  },
};
