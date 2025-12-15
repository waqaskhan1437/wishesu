import { IController } from "../interfaces";

export abstract class BaseController implements IController {
  abstract handle(request: Request): Promise<Response>;

  protected async parseBody<T>(request: Request): Promise<T> {
    try {
      return await request.json() as T;
    } catch {
      throw new Error("Invalid JSON");
    }
  }

  protected success<T>(data: T, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  }

  protected error(message: string, status = 400): Response {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  }
}
