import { AuthRepository } from "./repository";
import { AuthService } from "./service";
import { AuthController } from "./controller";

export function AuthModule(container: any) {
  const repo = new AuthRepository(container.get("db"));
  const service = new AuthService(repo, container.get("secret"));
  const controller = new AuthController(service);

  return {
    routes: [
      { method: "POST", path: "/auth/register", handler: (req: Request) => controller.handle(req) },
      { method: "POST", path: "/auth/login", handler: (req: Request) => controller.handle(req) }
    ]
  };
}
