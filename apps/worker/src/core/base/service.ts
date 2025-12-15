// 🔧 BASE SERVICE - Max 150 lines
// Business logic layer

import { IService } from "../interfaces";

export abstract class BaseService<T> implements IService<T> {
  constructor(protected repository: any) {}

  async get(id: string): Promise<T | null> {
    return await this.repository.findById(id);
  }

  async list(filters?: any): Promise<T[]> {
    return await this.repository.findAll(filters);
  }

  async create(data: any): Promise<T> {
    // Validation happens here
    const validated = await this.validate(data);
    return await this.repository.create(validated);
  }

  async update(id: string, data: any): Promise<T> {
    const validated = await this.validate(data);
    return await this.repository.update(id, validated);
  }

  async remove(id: string): Promise<boolean> {
    return await this.repository.delete(id);
  }

  // Abstract validation - each service implements own rules
  protected abstract validate(data: any): Promise<Partial<T>>;

  // Helper: Check if entity exists
  protected async ensureExists(id: string): Promise<T> {
    const entity = await this.get(id);
    if (!entity) {
      throw new Error(\`Entity not found: \${id}\`);
    }
    return entity;
  }
}
