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

  protected abstract validate(data: any): Promise<Partial<T>>;
}
