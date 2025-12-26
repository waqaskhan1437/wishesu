/**
 * Media & Upload Router
 */
import { Router } from 'itty-router';
import { archiveCredentials, r2Presign, tempFile, r2File } from '../controller/controller.js';

const mediaRouter = Router({ base: '/api' });

// Upload Routes
mediaRouter.post('/upload/archive-credentials', archiveCredentials);
mediaRouter.post('/upload/r2-presign', r2Presign);
mediaRouter.post('/upload/temp-file', tempFile);

// Retrieval Routes
mediaRouter.get('/r2/file', r2File);

export { mediaRouter };
