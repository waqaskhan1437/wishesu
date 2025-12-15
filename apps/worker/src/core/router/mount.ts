import type { Container } from "../container";
import type { Router } from "./router";

export type Module = { mount: (r: Router, c: Container) => void };

export function mountAll(router: Router, c: Container, modules: Module[]) {
  for (const m of modules) m.mount(router, c);
}
