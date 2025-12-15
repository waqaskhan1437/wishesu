import { HttpError } from "../../core/errors";
import type { ProductCreateIn, ProductRow } from "./dto";
import type { ProductsRepo } from "./repo";

export class ProductsService {
  constructor(private repo: ProductsRepo) {}

  async create(userId: string, input: ProductCreateIn) {
    if (!input?.title || !input?.slug) throw new HttpError(400, "INVALID_INPUT");
    const now = Date.now();
    const p: ProductRow = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      slug: input.slug.trim(),
      description: input.description ?? null,
      price: input.price ?? null,
      currency: input.currency ?? "USD",
      status: "draft",
      created_by: userId,
      created_at: now,
      updated_at: now,
    };
    return await this.repo.insert(p);
  }

  async getById(id: string) {
    const p = await this.repo.getById(id);
    if (!p) throw new HttpError(404, "NOT_FOUND");
    return p;
  }
}
