import { AuthModule } from "./auth";
import { ProductsModule } from "./products";
import { MediaModule } from "./media";

export function loadModules(container: any) {
  const modules = [
    AuthModule(container),
    ProductsModule(container),
    MediaModule(container)
  ];
  
  return modules;
}
