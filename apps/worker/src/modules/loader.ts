// 📦 MODULE LOADER - Max 100 lines
// Dynamically loads all modules

import { AuthModule } from "./auth";
import { ProductsModule } from "./products";
import { MediaModule } from "./media";

export function loadModules(container: any) {
  console.log("📦 Loading modules...");
  
  const modules = [
    AuthModule(container),
    ProductsModule(container),
    MediaModule(container),
    // Auto-add new modules here
  ];
  
  console.log(\`✅ Loaded \${modules.length} modules\`);
  return modules;
}

// Module registry for auto-discovery
export const MODULE_REGISTRY = new Map();

export function registerModule(name: string, factory: any) {
  MODULE_REGISTRY.set(name, factory);
  console.log(\`📝 Registered module: \${name}\`);
}
