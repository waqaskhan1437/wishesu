// 🧠 SMART INDEX - Self-Configuring Entry Point
// Max 150 lines - delegates to modules

import { ArchitectureValidator } from "./core/validator";
import { AutoMigration } from "./core/auto-migration";
import { Container } from "./core/container";
import { Router } from "./core/router/router";
import { loadModules } from "./modules/loader";

let initialized = false;

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    // One-time initialization
    if (!initialized) {
      console.log("🚀 Initializing system...");
      
      // Step 1: Validate architecture
      ArchitectureValidator.validate();
      
      // Step 2: Auto-migrate database
      const migration = new AutoMigration(env);
      await migration.autoSetup();
      
      // Step 3: Mark as initialized
      initialized = true;
      console.log("✅ System ready!");
    }

    // Build container with dependencies
    const container = new Container();
    container.bind("db", () => env.DB);
    container.bind("storage", () => env.MEDIA);
    container.bind("secret", () => env.TOKEN_SECRET || "default-secret");

    // Load all modules dynamically
    const router = new Router();
    const modules = loadModules(container);
    
    modules.forEach(module => {
      module.routes.forEach(route => {
        router.add(route.method, route.path, route.handler);
      });
    });

    // Handle request
    try {
      return await router.handle(request);
    } catch (error: any) {
      console.error("Request error:", error);
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
