import type { SeoRepo } from "./repo";

export class SeoService {
  constructor(private repo: SeoRepo) {}

  async save(productId: string, input: any) {
    const row = {
      product_id: productId,
      meta_title: input?.meta_title ?? null,
      meta_description: input?.meta_description ?? null,
      og_image_r2_key: input?.og_image_r2_key ?? null,
      canonical_url: input?.canonical_url ?? null,
    };
    return await this.repo.upsert(row);
  }

  async get(productId: string) {
    return await this.repo.get(productId);
  }
}
