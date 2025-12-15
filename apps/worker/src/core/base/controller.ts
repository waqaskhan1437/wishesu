// 🎮 BASE CONTROLLER - Max 150 lines
// HTTP request handling

import { IController } from "../interfaces";

export abstract class BaseController implements IController {
  abstract handle(request: Request): Promise<Response>;

  // Helper: Parse JSON body
  protected async parseBody<T>(request: Request): Promise<T> {
    try {
      return await request.json() as T;
    } catch {
      throw new Error("Invalid JSON body");
    }
  }

  // Helper: Get URL params
  protected getParams(request: Request, pattern: string): Record<string, string> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const patternParts = pattern.split("/").filter(Boolean);
    
    const params: Record<string, string> = {};
    patternParts.forEach((part, i) => {
      if (part.startsWith(":")) {
        params[part.slice(1)] = pathParts[i];
      }
    });
    
    return params;
  }

  // Helper: Success response
  protected success<T>(data: T, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Helper: Error response
  protected error(message: string, status = 400): Response {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  }
}
