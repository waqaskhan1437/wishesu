/**
 * Pages controller - re-export from feature modules.
 */

export {
  getPages,
  getPagesList,
  getPage,
  savePage,
  savePageBuilder,
  deletePage,
  deletePageBySlug,
  updatePageStatus,
  duplicatePage,
  loadPageBuilder,
  seedBuiltInPages,
  serveDynamicPage
} from '../features/pages/index.js';
