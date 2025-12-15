export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filters?: any): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

export interface IService<T> {
  get(id: string): Promise<T | null>;
  list(filters?: any): Promise<T[]>;
  create(data: any): Promise<T>;
  update(id: string, data: any): Promise<T>;
  remove(id: string): Promise<boolean>;
}

export interface IController {
  handle(request: Request): Promise<Response>;
}
