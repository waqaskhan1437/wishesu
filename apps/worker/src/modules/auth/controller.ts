// 🎮 AUTH CONTROLLER - Max 100 lines
import { BaseController } from "../../core/base/controller";
import { AuthService } from "./service";

export class AuthController extends BaseController {
  constructor(private service: AuthService) {
    super();
  }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/auth/register" && request.method === "POST") {
      return this.register(request);
    }

    if (path === "/auth/login" && request.method === "POST") {
      return this.login(request);
    }

    return this.error("Not found", 404);
  }

  private async register(request: Request): Promise<Response> {
    try {
      const { email, password } = await this.parseBody<any>(request);
      const user = await this.service.register(email, password);
      return this.success(user, 201);
    } catch (error: any) {
      return this.error(error.message);
    }
  }

  private async login(request: Request): Promise<Response> {
    try {
      const { email, password } = await this.parseBody<any>(request);
      const token = await this.service.login(email, password);
      return this.success({ token });
    } catch (error: any) {
      return this.error(error.message, 401);
    }
  }
}
