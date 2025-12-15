import { AuthModule } from "./auth";
import { ProductsModule } from "./products";

export function loadModules(container: any) {
  const modules = [
    AuthModule(container),
    ProductsModule(container)
  ];
  
  return modules;
}
