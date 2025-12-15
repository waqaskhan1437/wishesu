import type { SeoRow } from "./dto";

export class SeoRepo {
  constructor(private db: D1Database) {}

  async upsert(row: SeoRow) {
    await this.db
      .prepare(
        "INSERT INTO product_seo (product_id,meta_title,meta_description,og_image_r2_key,canonical_url) VALUES (?,?,?,?,?) " +
          "ON CONFLICT(product_id) DO UPDATE SET meta_title=excluded.meta_title, meta_description=excluded.meta_description, og_image_r2_key=excluded.og_image_r2_key, canonical_url=excluded.canonical_url"
      )
      .bind(row.product_id, row.meta_title, row.meta_description, row.og_image_r2_key, row.canonical_url)
      .run();
    return row;
  }

  async get(productId: string): Promise<SeoRow | null> {
    return await this.db.prepare("SELECT * FROM product_seo WHERE product_id = ?").bind(productId).first<SeoRow>();
  }
}
