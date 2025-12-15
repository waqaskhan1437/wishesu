export type Factory<T> = (c: Container) => T;

export class Container {
  private singletons = new Map<string, any>();
  private factories = new Map<string, Factory<any>>();

  bind<T>(key: string, factory: Factory<T>) {
    this.factories.set(key, factory);
  }

  get<T>(key: string): T {
    if (this.singletons.has(key)) return this.singletons.get(key);
    const f = this.factories.get(key);
    if (!f) throw new Error(`Container missing: ${key}`);
    const v = f(this);
    this.singletons.set(key, v);
    return v;
  }
}
