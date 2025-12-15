import { Context } from "./context";
import { HttpError } from "../errors";
import { json } from "../response";

type Handler = (ctx: Context, next: () => Promise<Response>) => Promise<Response> | Response;

type Route = {
  method: string;
  regex: RegExp;
  keys: string[];
  handlers: Handler[];
};

function compile(path: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const pat = path
    .split("/")
    .map((p) => {
      if (p.startsWith(":")) {
        keys.push(p.slice(1));
        return "([^/]+)";
      }
      return p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { regex: new RegExp(`^${pat}$`), keys };
}

async function runHandlers(ctx: Context, handlers: Handler[]): Promise<Response> {
  let i = -1;
  const next = async (): Promise<Response> => {
    i++;
    const h = handlers[i];
    if (!h) return json({ ok: false, error: "NO_HANDLER" }, 500);
    return await h(ctx, next);
  };
  return next();
}

export class Router {
  private routes: Route[] = [];

  get(path: string, ...handlers: Handler[]) {
    const { regex, keys } = compile(path);
    this.routes.push({ method: "GET", regex, keys, handlers });
  }

  post(path: string, ...handlers: Handler[]) {
    const { regex, keys } = compile(path);
    this.routes.push({ method: "POST", regex, keys, handlers });
  }

  async handle(req: Request, env: any): Promise<Response> {
    const url = new URL(req.url);
    const pathname = url.pathname;

    const r = this.routes.find((x) => x.method === req.method && x.regex.test(pathname));
    if (!r) return json({ ok: false, error: "NOT_FOUND" }, 404);

    const m = pathname.match(r.regex);
    const params: Record<string, string> = {};
    if (m) for (let i = 0; i < r.keys.length; i++) params[r.keys[i]] = m[i + 1] ?? "";

    const ctx = new Context(req, env, params);

    try {
      return await runHandlers(ctx, r.handlers);
    } catch (e: any) {
      if (e instanceof HttpError) return ctx.json({ ok: false, error: e.code }, e.status);
      return ctx.json({ ok: false, error: "INTERNAL_ERROR" }, 500);
    }
  }
}
