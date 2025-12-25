/**
 * Customer helpers (identified by email)
 */

export function normalizeEmail(input) {
  return String(input || '').trim().toLowerCase();
}

export async function upsertCustomer(env, email, name) {
  const e = normalizeEmail(email);
  if (!e) return null;
  const n = String(name || '').trim();
  await env.DB.prepare(
    `INSERT INTO customers (email, name)
     VALUES (?, ?)
     ON CONFLICT(email) DO UPDATE SET
       name = CASE
         WHEN customers.name IS NULL OR customers.name = '' THEN excluded.name
         ELSE customers.name
       END`
  ).bind(e, n || null).run();
  return e;
}

export async function isCustomerBlocked(env, email, field) {
  const e = normalizeEmail(email);
  if (!e) return false;
  const column =
    field === 'blog' ? 'blocked_blog' :
    field === 'forum' ? 'blocked_forum' :
    field === 'orders' ? 'blocked_orders' :
    null;
  if (!column) return false;
  const row = await env.DB.prepare(`SELECT ${column} as blocked FROM customers WHERE email = ?`)
    .bind(e)
    .first();
  return !!(row && row.blocked);
}
