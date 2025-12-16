import { BaseRepository } from "../../core/base/repository";

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  sale_price: number | null;
  currency: string;
  stock: number;
  sku: string;
  status: string;
  galleries: any[];
  videos: any[];
  addons: any[];
  seo: any;
  created_at: number;
  updated_at: number;
}

export class ProductsRepository extends BaseRepository<Product> {
  tableName = "products";

  async findBySlug(slug: string): Promise<Product | null> {
    const result = await this.db
      .prepare("SELECT * FROM products WHERE slug = ?")
      .bind(slug)
      .first();
    return result || null;
  }

  async list(limit = 50): Promise<Product[]> {
    const result = await this.db
      .prepare("SELECT * FROM products ORDER BY created_at DESC LIMIT ?")
      .bind(limit)
      .all();
    return result.results || [];
  }
}
