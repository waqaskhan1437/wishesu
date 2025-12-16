import { BaseService } from "../../core/base/service";
import { ProductsRepository, Product } from "./repository";

export class ProductsService extends BaseService<Product> {
  constructor(protected repository: ProductsRepository) {
    super(repository);
  }

  protected async validate(data: any): Promise<Partial<Product>> {
    if (!data.title) throw new Error("Title required");
    if (!data.slug) throw new Error("Slug required");
    if (!data.price || data.price < 0) throw new Error("Valid price required");

    const existing = await this.repository.findBySlug(data.slug);
    if (existing && existing.id !== data.id) {
      throw new Error("Slug already exists");
    }

    return {
      id: data.id || crypto.randomUUID(),
      title: data.title,
      slug: data.slug,
      description: data.description || '',
      price: parseFloat(data.price) || 0,
      sale_price: data.sale_price ? parseFloat(data.sale_price) : null,
      currency: data.currency || 'USD',
      stock: parseInt(data.stock) || 0,
      sku: data.sku || '',
      status: data.status || 'draft',
      galleries: JSON.stringify(data.galleries || []),
      videos: JSON.stringify(data.videos || []),
      addons: JSON.stringify(data.addons || []),
      seo: JSON.stringify(data.seo || {}),
      created_at: data.created_at || Date.now(),
      updated_at: Date.now()
    } as any;
  }

  async getWithParsedData(id: string): Promise<any> {
    const product = await this.get(id);
    if (!product) return null;

    return {
      ...product,
      galleries: JSON.parse(product.galleries as any || '[]'),
      videos: JSON.parse(product.videos as any || '[]'),
      addons: JSON.parse(product.addons as any || '[]'),
      seo: JSON.parse(product.seo as any || '{}')
    };
  }

  async listWithParsedData(): Promise<any[]> {
    const products = await this.repository.list();
    return products.map(p => ({
      ...p,
      galleries: JSON.parse(p.galleries as any || '[]'),
      videos: JSON.parse(p.videos as any || '[]'),
      addons: JSON.parse(p.addons as any || '[]'),
      seo: JSON.parse(p.seo as any || '{}')
    }));
  }
}
