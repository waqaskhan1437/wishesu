import { setupProductTable } from '../../modules/products/schema.js';
import { setupOrderTable } from '../../modules/orders/schema.js';
import { setupWhopTables } from '../../modules/whop/schema.js';
import { setupChatTables } from '../../modules/chat/schema.js';

let initialized = false;

export async function initDB(env) {
  if (!env.DB) throw new Error('DB binding missing');
  if (initialized) return;
  await env.DB.prepare('SELECT 1').first();
  await setupProductTable(env.DB);
  await setupOrderTable(env.DB);
  await setupWhopTables(env.DB);
  await setupChatTables(env.DB);
  initialized = true;
}
