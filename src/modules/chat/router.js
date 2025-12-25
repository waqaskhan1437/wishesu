import { start, send, poll } from './controller.js';

export async function chatRouter(req, env, url, path, method) {
  if (method === 'POST' && path === '/api/chat/start') {
    return start(req, env);
  }
  if (method === 'POST' && path === '/api/chat/send') {
    return send(req, env);
  }
  if (method === 'GET' && path === '/api/chat/poll') {
    return poll(req, env, url);
  }
  return null;
}
