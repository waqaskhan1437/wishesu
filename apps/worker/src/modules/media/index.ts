// 📦 MEDIA MODULE
export function MediaModule(container: any) {
  return {
    name: "media",
    version: "1.0.0",
    routes: [
      { method: "GET", path: "/media", handler: async () => new Response("[]") }
    ]
  };
}
