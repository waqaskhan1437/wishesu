/**
 * Admin Users Controller
 * User management operations
 */

import { json } from '../../utils/response.js';
import { normalizeEmail } from '../../utils/customers.js';

/**
 * List all users
 */
export async function listUsers(env) {
  try {
    const result = await env.DB.prepare('SELECT email, blocked, created_at FROM customers ORDER BY created_at DESC')
      .all();

    return json({
      success: true,
      users: result.results || []
    });

  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

/**
 * Update user blocks
 */
export async function updateUserBlocks(env, body) {
  try {
    const { email, blocked } = body;

    if (!email) {
      return json({ error: 'Email is required' }, 400);
    }

    const normalizedEmail = normalizeEmail(email);

    await env.DB.prepare('UPDATE customers SET blocked = ? WHERE email = ?')
      .bind(blocked ? 1 : 0, normalizedEmail)
      .run();

    return json({ success: true });

  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export default { listUsers, updateUserBlocks };
