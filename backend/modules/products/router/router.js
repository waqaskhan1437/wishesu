/**
 * Products Module Router
 */
import { Router } from 'itty-router';
import { list, get, save, remove, duplicate } from '../controller/controller.js';

const productRouter = Router();

// Routes
productRouter.get('/products', list);
productRouter.get('/product/list', list);
productRouter.get('/product/:id', get);
productRouter.post('/product/save', save);
productRouter.delete('/product/delete', remove);
productRouter.post('/product/duplicate', duplicate);

export { productRouter };
