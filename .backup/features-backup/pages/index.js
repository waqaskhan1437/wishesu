/**
 * Page backend exports.
 */

export { getPages, getPagesList } from './list.js';
export { getPage } from './detail.js';
export { savePage, savePageBuilder } from './save.js';
export { deletePage, deletePageBySlug, updatePageStatus } from './status.js';
export { duplicatePage } from './duplicate.js';
export { loadPageBuilder } from './builder.js';
export { seedBuiltInPages } from './builtin.js';
export { serveDynamicPage } from './serve.js';
