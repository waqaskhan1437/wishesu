import type { ProductRow } from "./dto";

export class ProductsRepo {
  constructor(private db: D1Database) {}

  async insert(p: ProductRow) {
    await this.db
      .prepare(
        "INSERT INTO products (id,title,slug,description,price,currency,status,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)"
      )
      .bind(
        p.id,
        p.title,
        p.slug,
        p.description,
        p.price,
        p.currency,
        p.status,
        p.created_by,
        p.created_at,
        p.updated_at
      )
      .run();
    return p;
  }

  async getById(id: string): Promise<ProductRow | null> {
    return await this.db.prepare("SELECT * FROM products WHERE id = ?").bind(id).first<ProductRow>();
  }
}
