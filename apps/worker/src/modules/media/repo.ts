import type { MediaRow } from "./dto";

export class MediaRepo {
  constructor(private db: D1Database) {}

  async insert(m: MediaRow) {
    await this.db
      .prepare(
        "INSERT INTO product_media (id,product_id,r2_key,kind,alt,sort_order,created_at) VALUES (?,?,?,?,?,?,?)"
      )
      .bind(m.id, m.product_id, m.r2_key, m.kind, m.alt, m.sort_order, m.created_at)
      .run();
    return m;
  }

  async listByProduct(productId: string): Promise<MediaRow[]> {
    const r = await this.db
      .prepare("SELECT * FROM product_media WHERE product_id = ? ORDER BY sort_order ASC, created_at ASC")
      .bind(productId)
      .all<MediaRow>();
    return r.results ?? [];
  }
}
