import { HttpError } from "../../core/errors";
import type { AddonsRepo } from "./repo";

export class AddonsService {
  constructor(private repo: AddonsRepo) {}

  async add(productId: string, input: any) {
    if (!productId) throw new HttpError(400, "INVALID_PRODUCT");
    if (!input?.name) throw new HttpError(400, "INVALID_INPUT");
    const a = {
      id: crypto.randomUUID(),
      product_id: productId,
      name: String(input.name).trim(),
      price_delta: Number(input.price_delta ?? 0),
      is_required: input.is_required ? 1 : 0,
      created_at: Date.now(),
    };
    return await this.repo.insert(a);
  }

  async list(productId: string) {
    return await this.repo.list(productId);
  }
}
