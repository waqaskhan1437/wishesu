export class Router {
  private routes = new Map();

  add(method: string, path: string, handler: any) {
    const key = `${method}:${path}`;
    this.routes.set(key, handler);
  }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const key = `${request.method}:${url.pathname}`;
    
    const handler = this.routes.get(key);
    if (handler) {
      return await handler(request);
    }
    
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
}
