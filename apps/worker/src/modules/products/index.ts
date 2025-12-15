// 📦 PRODUCTS MODULE
export function ProductsModule(container: any) {
  return {
    name: "products",
    version: "1.0.0",
    routes: [
      { method: "GET", path: "/products", handler: async () => new Response("[]") }
    ]
  };
}
