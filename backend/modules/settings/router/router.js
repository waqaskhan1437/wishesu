/**
 * Settings Router
 */
import { Router } from 'itty-router';
import { getWhopSettings, saveWhopSettings } from '../controller/controller.js';

const settingsRouter = Router({ base: '/api/settings' });

settingsRouter.get('/whop', getWhopSettings);
settingsRouter.post('/whop', saveWhopSettings);

export { settingsRouter };
