export class Container {
  private services = new Map();

  bind(name: string, factory: any) {
    this.services.set(name, factory);
  }

  get(name: string) {
    const factory = this.services.get(name);
    if (!factory) throw new Error(`Service not found: ${name}`);
    return typeof factory === 'function' ? factory(this) : factory;
  }
}
