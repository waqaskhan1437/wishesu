export function ProductsModule(container: any) {
  return {
    routes: [
      {
        method: "GET",
        path: "/products",
        handler: async () => new Response(JSON.stringify([]), {
          headers: { "Content-Type": "application/json" }
        })
      }
    ]
  };
}
