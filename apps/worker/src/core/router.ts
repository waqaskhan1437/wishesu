export class Router {
  private routes: { method: string; path: string; handler: any }[] = [];

  add(method: string, path: string, handler: any) {
    this.routes.push({ method, path, handler });
  }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;

    for (const route of this.routes) {
      if (route.method === method && this.matchPath(route.path, pathname)) {
        return await route.handler(request);
      }
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  private matchPath(pattern: string, path: string): boolean {
    if (pattern === path) return true;
    
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);
    
    if (patternParts.length !== pathParts.length) return false;
    
    return patternParts.every((part, i) => 
      part.startsWith(':') || part === pathParts[i]
    );
  }
}
