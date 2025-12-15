// 📦 AUTH MODULE - Max 50 lines
import { AuthRepository } from "./repository";
import { AuthService } from "./service";
import { AuthController } from "./controller";

export function AuthModule(container: any) {
  const repo = new AuthRepository(container.get("db"));
  const service = new AuthService(repo, container.get("secret"));
  const controller = new AuthController(service);

  return {
    name: "auth",
    version: "1.0.0",
    routes: [
      {
        method: "POST",
        path: "/auth/register",
        handler: (req: Request) => controller.handle(req)
      },
      {
        method: "POST",
        path: "/auth/login",
        handler: (req: Request) => controller.handle(req)
      }
    ]
  };
}
