/**
 * Central CORS Configuration
 */
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

export const handleOptions = (request) => {
  // Return valid response for OPTIONS preflight
  const headers = { ...CORS };
  
  if (request.headers.get('Origin')) {
    headers['Access-Control-Allow-Origin'] = request.headers.get('Origin');
  }

  if (request.headers.get('Access-Control-Request-Method')) {
    headers['Access-Control-Allow-Methods'] = request.headers.get('Access-Control-Request-Method');
  }

  if (request.headers.get('Access-Control-Request-Headers')) {
    headers['Access-Control-Allow-Headers'] = request.headers.get('Access-Control-Request-Headers');
  }

  return new Response(null, { status: 204, headers });
};
