import { Container } from "./core/container";
import { Router } from "./core/router/router";
import { mountAll } from "./core/router/mount";
import { tokenAuth } from "./core/router/middlewares/auth";

import { AuthModule } from "./modules/auth/routes";
import { ProductsModule } from "./modules/products/routes";
import { MediaModule } from "./modules/media/routes";
import { AddonsModule } from "./modules/addons/routes";
import { SeoModule } from "./modules/seo/routes";

import { AuthRepo } from "./modules/auth/repo";
import { AuthService } from "./modules/auth/service";

import { ProductsRepo } from "./modules/products/repo";
import { ProductsService } from "./modules/products/service";

import { MediaRepo } from "./modules/media/repo";
import { MediaService } from "./modules/media/service";

import { AddonsRepo } from "./modules/addons/repo";
import { AddonsService } from "./modules/addons/service";

import { SeoRepo } from "./modules/seo/repo";
import { SeoService } from "./modules/seo/service";

function buildContainer(env: any) {
  const c = new Container();

  c.bind("auth.repo", () => new AuthRepo(env.DB));
  c.bind("auth.service", (x) => new AuthService(x.get("auth.repo"), env.TOKEN_SECRET));

  c.bind("products.repo", () => new ProductsRepo(env.DB));
  c.bind("products.service", (x) => new ProductsService(x.get("products.repo")));

  c.bind("media.repo", () => new MediaRepo(env.DB));
  c.bind("media.service", (x) => new MediaService(env.MEDIA, x.get("media.repo")));

  c.bind("addons.repo", () => new AddonsRepo(env.DB));
  c.bind("addons.service", (x) => new AddonsService(x.get("addons.repo")));

  c.bind("seo.repo", () => new SeoRepo(env.DB));
  c.bind("seo.service", (x) => new SeoService(x.get("seo.repo")));

  return c;
}

function buildRouter(c: Container) {
  const r = new Router();

  // Global token parsing (sets ctx.user if token is valid)
  const withAuth = (h: any) => async (ctx: any, next: any) => h(ctx, next);

  // Apply tokenAuth to all routes by wrapping handlers in modules (simple approach):
  // Here we mount a small "preflight" route group pattern: each route will call tokenAuth first.
  // (Keep it explicit and predictable.)
  const originalGet = r.get.bind(r);
  const originalPost = r.post.bind(r);

  r.get = (path: string, ...handlers: any[]) => originalGet(path, tokenAuth as any, ...handlers);
  r.post = (path: string, ...handlers: any[]) => originalPost(path, tokenAuth as any, ...handlers);

  mountAll(r, c, [AuthModule, ProductsModule, MediaModule, AddonsModule, SeoModule]);

  r.get("/", async (ctx: any) => ctx.json({ ok: true, name: "product-worker" }));

  return r;
}

export default {
  async fetch(req: Request, env: any): Promise<Response> {
    const c = buildContainer(env);
    const router = buildRouter(c);
    return router.handle(req, env);
  },
};
