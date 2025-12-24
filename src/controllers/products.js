/**
 * Products controller - re-export from feature modules.
 */

export {
  getProducts,
  getProductsList,
  getProduct,
  saveProduct,
  deleteProduct,
  updateProductStatus,
  duplicateProduct,
  handleProductRouting
} from '../features/products/index.js';
