import { ProductsRepository } from "./repository";
import { ProductsService } from "./service";
import { ProductsController } from "./controller";

export function ProductsModule(container: any) {
  const repo = new ProductsRepository(container.get("db"));
  const service = new ProductsService(repo);
  const controller = new ProductsController(service);

  return {
    routes: [
      { method: "GET", path: "/products", handler: (req: Request) => controller.handle(req) },
      { method: "GET", path: "/products/:id", handler: (req: Request) => controller.handle(req) },
      { method: "POST", path: "/products", handler: (req: Request) => controller.handle(req) },
      { method: "PUT", path: "/products/:id", handler: (req: Request) => controller.handle(req) },
      { method: "DELETE", path: "/products/:id", handler: (req: Request) => controller.handle(req) }
    ]
  };
}
