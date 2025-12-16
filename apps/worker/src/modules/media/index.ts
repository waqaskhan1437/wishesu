export function MediaModule(container: any) {
  const storage = container.get("storage");

  async function uploadFile(request: Request): Promise<Response> {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return new Response(JSON.stringify({ error: 'No file provided' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const filename = Date.now() + '-' + file.name;
      const buffer = await file.arrayBuffer();
      
      await storage.put(filename, buffer, {
        httpMetadata: {
          contentType: file.type
        }
      });

      const url = `/media/${filename}`;
      
      return new Response(JSON.stringify({ 
        success: true, 
        url: url,
        filename: filename,
        type: file.type,
        size: file.size
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async function getFile(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const filename = url.pathname.split('/media/')[1];
      
      if (!filename) {
        return new Response('Not found', { status: 404 });
      }

      const object = await storage.get(filename);
      
      if (!object) {
        return new Response('File not found', { status: 404 });
      }

      return new Response(object.body, {
        headers: {
          'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    } catch (error: any) {
      return new Response(error.message, { status: 500 });
    }
  }

  return {
    routes: [
      { method: "POST", path: "/media/upload", handler: uploadFile },
      { method: "GET", path: "/media/:filename", handler: getFile }
    ]
  };
}
