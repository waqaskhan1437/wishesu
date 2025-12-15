// 🏗️ MODULE GENERATOR - Auto-Scaffolding
// Generates properly structured modules automatically

export class ModuleGenerator {
  static generate(moduleName: string) {
    console.log(\`🏗️ Generating module: \${moduleName}\`);
    
    const template = {
      repository: this.generateRepository(moduleName),
      service: this.generateService(moduleName),
      controller: this.generateController(moduleName),
      routes: this.generateRoutes(moduleName),
      types: this.generateTypes(moduleName),
      validators: this.generateValidators(moduleName)
    };
    
    console.log(\`✅ Module structure ready for: \${moduleName}\`);
    return template;
  }

  private static generateRepository(name: string) {
    return \`
// Auto-generated Repository for \${name}
import { BaseRepository } from "../../core/base/repository";

export class \${this.capitalize(name)}Repository extends BaseRepository<\${this.capitalize(name)}> {
  tableName = "\${name}";
  
  // Add custom queries here (max 50 lines each)
}
\`;
  }

  private static generateService(name: string) {
    return \`
// Auto-generated Service for \${name}
import { BaseService } from "../../core/base/service";

export class \${this.capitalize(name)}Service extends BaseService<\${this.capitalize(name)}> {
  protected async validate(data: any) {
    // Add validation logic
    return data;
  }
  
  // Add business logic here (max 50 lines each)
}
\`;
  }

  private static generateController(name: string) {
    return \`
// Auto-generated Controller for \${name}
import { BaseController } from "../../core/base/controller";

export class \${this.capitalize(name)}Controller extends BaseController {
  async handle(request: Request): Promise<Response> {
    // Route handling logic
    return this.success({ message: "Working!" });
  }
}
\`;
  }

  private static generateRoutes(name: string) {
    return \`
// Auto-generated Routes for \${name}
export function \${this.capitalize(name)}Module(container: any) {
  return {
    name: "\${name}",
    version: "1.0.0",
    routes: [
      { method: "GET", path: "/\${name}", handler: /* controller */ },
      { method: "POST", path: "/\${name}", handler: /* controller */ },
      { method: "PUT", path: "/\${name}/:id", handler: /* controller */ },
      { method: "DELETE", path: "/\${name}/:id", handler: /* controller */ }
    ]
  };
}
\`;
  }

  private static generateTypes(name: string) {
    return \`
// Auto-generated Types for \${name}
export interface \${this.capitalize(name)} {
  id: string;
  created_at: number;
  updated_at: number;
  // Add fields here
}

export interface Create\${this.capitalize(name)}Input {
  // Add required fields
}

export interface Update\${this.capitalize(name)}Input {
  // Add optional fields
}
\`;
  }

  private static generateValidators(name: string) {
    return \`
// Auto-generated Validators for \${name}
export class \${this.capitalize(name)}Validator {
  static validate(data: any) {
    // Add validation rules
    return true;
  }
  
  static sanitize(data: any) {
    // Remove unwanted fields
    return data;
  }
}
\`;
  }

  private static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
