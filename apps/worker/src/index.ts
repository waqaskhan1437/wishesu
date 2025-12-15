import { AutoMigration } from "./core/auto-migration";
import { Container } from "./core/container";
import { Router } from "./core/router";
import { loadModules } from "./modules/loader";

let initialized = false;

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    if (!initialized) {
      const migration = new AutoMigration(env);
      await migration.autoSetup();
      initialized = true;
    }

    const container = new Container();
    container.bind("db", () => env.DB);
    container.bind("storage", () => env.MEDIA);
    container.bind("secret", () => env.TOKEN_SECRET || "default-secret");

    const router = new Router();
    const modules = loadModules(container);
    
    modules.forEach(module => {
      module.routes.forEach(route => {
        router.add(route.method, route.path, route.handler);
      });
    });

    try {
      return await router.handle(request);
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message }), 
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  },
};
