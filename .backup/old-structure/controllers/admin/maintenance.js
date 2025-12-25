/**
 * Admin maintenance controller re-export.
 */

export {
  testGoogleSync,
  clearTempFiles,
  clearPendingCheckouts
} from '../../features/admin/maintenance.js';

export default { testGoogleSync, clearTempFiles, clearPendingCheckouts };
