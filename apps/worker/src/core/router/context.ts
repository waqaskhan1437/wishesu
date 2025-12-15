import { json } from "../response";

export class Context {
  req: Request;
  env: any;
  params: Record<string, string>;
  state = new Map<string, any>();
  user?: { id: string; role: string; email: string };

  constructor(req: Request, env: any, params: Record<string, string>) {
    this.req = req;
    this.env = env;
    this.params = params;
  }

  set(key: string, value: any) {
    this.state.set(key, value);
  }

  get<T>(key: string): T | undefined {
    return this.state.get(key);
  }

  json(body: any, status = 200, headers?: HeadersInit) {
    return json(body, status, headers);
  }
}
