/*
 * Pricing and checkout helpers.
 */

import { initAddonEmailListener } from './modules/email-sync.js';
import { updateTotal } from './modules/totals.js';
import { handleCheckout } from './modules/handler.js';

window.updateTotal = updateTotal;
window.handleCheckout = handleCheckout;

document.addEventListener('DOMContentLoaded', initAddonEmailListener);
