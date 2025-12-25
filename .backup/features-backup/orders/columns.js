/**
 * Order schema helpers.
 */

let ordersColumnsChecked = false;

export async function ensureOrderColumns(env) {
  if (ordersColumnsChecked) return;
  try {
    await env.DB.prepare('ALTER TABLE orders ADD COLUMN assigned_team TEXT').run();
  } catch (_) {}
  ordersColumnsChecked = true;
}
