import type { AddonRow } from "./dto";

export class AddonsRepo {
  constructor(private db: D1Database) {}

  async insert(a: AddonRow) {
    await this.db
      .prepare("INSERT INTO product_addons (id,product_id,name,price_delta,is_required,created_at) VALUES (?,?,?,?,?,?)")
      .bind(a.id, a.product_id, a.name, a.price_delta, a.is_required, a.created_at)
      .run();
    return a;
  }

  async list(productId: string): Promise<AddonRow[]> {
    const r = await this.db
      .prepare("SELECT * FROM product_addons WHERE product_id = ? ORDER BY created_at ASC")
      .bind(productId)
      .all<AddonRow>();
    return r.results ?? [];
  }
}
