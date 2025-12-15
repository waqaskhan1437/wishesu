// 📐 BASE INTERFACES - Strict Contracts
// All modules MUST implement these interfaces

// Repository Pattern
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filters?: any): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

// Service Pattern
export interface IService<T> {
  get(id: string): Promise<T | null>;
  list(filters?: any): Promise<T[]>;
  create(data: any): Promise<T>;
  update(id: string, data: any): Promise<T>;
  remove(id: string): Promise<boolean>;
}

// Controller Pattern
export interface IController {
  handle(request: Request): Promise<Response>;
}

// Validation Pattern
export interface IValidator<T> {
  validate(data: any): T;
  sanitize(data: any): Partial<T>;
}

// Module Pattern
export interface IModule {
  name: string;
  version: string;
  routes: IRoute[];
}

export interface IRoute {
  method: string;
  path: string;
  handler: (req: Request) => Promise<Response>;
  middleware?: any[];
}
