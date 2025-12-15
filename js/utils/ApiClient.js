export class ApiClient {
  constructor() {
    this.baseUrl = window.API_URL || '';
  }

  async get(path) {
    const response = await fetch(this.baseUrl + path);
    if (!response.ok) throw new Error('Request failed');
    return await response.json();
  }

  async request(path, options = {}) {
    const response = await fetch(this.baseUrl + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }
    
    return await response.json();
  }

  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(this.baseUrl + '/media', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('Upload failed');
    return await response.json();
  }
}
