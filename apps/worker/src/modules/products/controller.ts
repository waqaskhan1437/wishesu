import { BaseController } from "../../core/base/controller";
import { ProductsService } from "./service";

export class ProductsController extends BaseController {
  constructor(private service: ProductsService) {
    super();
  }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // GET /products - List all
    if (path === '/products' && method === 'GET') {
      return this.list();
    }

    // GET /products/:id - Get one
    if (path.match(/^\/products\/[^/]+$/) && method === 'GET') {
      const id = path.split('/')[2];
      return this.getOne(id);
    }

    // POST /products - Create
    if (path === '/products' && method === 'POST') {
      return this.create(request);
    }

    // PUT /products/:id - Update
    if (path.match(/^\/products\/[^/]+$/) && method === 'PUT') {
      const id = path.split('/')[2];
      return this.update(id, request);
    }

    // DELETE /products/:id - Delete
    if (path.match(/^\/products\/[^/]+$/) && method === 'DELETE') {
      const id = path.split('/')[2];
      return this.delete(id);
    }

    return this.error("Not found", 404);
  }

  private async list(): Promise<Response> {
    try {
      const products = await this.service.listWithParsedData();
      return this.success(products);
    } catch (error: any) {
      return this.error(error.message, 500);
    }
  }

  private async getOne(id: string): Promise<Response> {
    try {
      const product = await this.service.getWithParsedData(id);
      if (!product) {
        return this.error("Product not found", 404);
      }
      return this.success(product);
    } catch (error: any) {
      return this.error(error.message, 500);
    }
  }

  private async create(request: Request): Promise<Response> {
    try {
      const data = await this.parseBody<any>(request);
      const product = await this.service.create(data);
      return this.success({ id: product.id, success: true }, 201);
    } catch (error: any) {
      return this.error(error.message, 400);
    }
  }

  private async update(id: string, request: Request): Promise<Response> {
    try {
      const data = await this.parseBody<any>(request);
      const product = await this.service.update(id, data);
      return this.success({ id: product.id, success: true });
    } catch (error: any) {
      return this.error(error.message, 400);
    }
  }

  private async delete(id: string): Promise<Response> {
    try {
      await this.service.remove(id);
      return this.success({ success: true });
    } catch (error: any) {
      return this.error(error.message, 500);
    }
  }
}
