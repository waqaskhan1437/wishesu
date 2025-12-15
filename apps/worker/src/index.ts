import { Container } from "./core/container";
import { Router } from "./core/router/router";
import { mountAll } from "./core/router/mount";
import { tokenAuth } from "./core/router/middlewares/auth";
import { AutoMigration, ensureR2Bucket } from "./core/auto-migration";

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

// Global auto-setup state
let autoSetupDone = false;

function buildContainer(env: any) {
  const c = new Container();

  c.bind("auth.repo", () => new AuthRepo(env.DB));
  c.bind("auth.service", (x) => new AuthService(x.get("auth.repo"), env.TOKEN_SECRET || "default-secret-change-me"));

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

  mountAll(r, [
    AuthModule(c),
    tokenAuth(c, [
      ProductsModule(c),
      MediaModule(c),
      AddonsModule(c),
      SeoModule(c),
    ]),
  ]);

  return r;
}

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    // Auto-setup on first request (only runs once)
    if (!autoSetupDone) {
      console.log("🧠 First request - running auto-setup...");
      
      try {
        const migration = new AutoMigration(env);
        const result = await migration.autoSetup();
        
        if (!result.success) {
          console.error("Auto-setup failed:", result.error);
          // Continue anyway - might be permissions issue
        }
        
        // Check R2 bucket
        await ensureR2Bucket(env);
        
        autoSetupDone = true;
        console.log("✅ Auto-setup complete - ready for requests!");
        
      } catch (error) {
        console.error("Auto-setup error:", error);
        // Don't block requests even if setup fails
      }
    }

    const c = buildContainer(env);
    const router = buildRouter(c);

    try {
      return await router.handle(request);
    } catch (error: any) {
      console.error("Request error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal Server Error",
          message: error.message 
        }), 
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  },
};
