/**
 * Orders Module Router
 */
import { Router } from 'itty-router';
import { list, get, create, updateStatus, deliver } from '../controller/controller.js';

const orderRouter = Router();

// Routes
orderRouter.get('/orders', list);
orderRouter.get('/order/:id', get);
orderRouter.post('/order/create', create);
orderRouter.post('/order/update-status', updateStatus);
orderRouter.post('/order/deliver', deliver);

export { orderRouter };
