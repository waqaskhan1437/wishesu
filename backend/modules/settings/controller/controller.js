/**
 * Settings Controller
 */
import { json } from '../../../core/utils/response/response.js';
import { CORS } from '../../../core/config/cors/cors.js';
import { getMultipleSettings, setMultipleSettings } from '../service/service.js';

const WHOP_KEYS = ['whop_product_id', 'whop_api_key', 'whop_webhook_secret'];

export async function getWhopSettings(req, env) {
  try {
    const settings = await getMultipleSettings(env.DB, WHOP_KEYS);
    return json({ 
      whop_product_id: settings.whop_product_id || '',
      whop_api_key: settings.whop_api_key || '',
      whop_webhook_secret: settings.whop_webhook_secret || ''
    }, 200, CORS);
  } catch (err) {
    return json({ error: err.message }, 500, CORS);
  }
}

export async function saveWhopSettings(req, env) {
  try {
    const body = await req.json().catch(() => ({}));
    
    const settings = {
      whop_product_id: body.whop_product_id || '',
      whop_api_key: body.whop_api_key || '',
      whop_webhook_secret: body.whop_webhook_secret || ''
    };
    
    await setMultipleSettings(env.DB, settings);
    return json({ ok: true }, 200, CORS);
  } catch (err) {
    return json({ error: err.message }, 500, CORS);
  }
}
