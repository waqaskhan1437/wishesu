/**
 * Chat Module Router
 */
import { Router } from 'itty-router';
import { start, send, poll } from '../controller/controller.js';

const chatRouter = Router();

chatRouter.post('/chat/start', start);
chatRouter.post('/chat/send', send);
chatRouter.get('/chat/poll', poll);

export { chatRouter };
