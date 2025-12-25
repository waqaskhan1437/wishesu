#!/usr/bin/env node

/**
 * Import Path Updater Script
 * Automatically updates old import paths to new modular structure
 */

const fs = require('fs');
const path = require('path');

// Import path mappings
const PATH_MAPPINGS = {
  // Module imports
  'from \'../../../public/js/product': 'from \'@modules/products/frontend/scripts/product',
  'from "../../../public/js/product': 'from "@modules/products/frontend/scripts/product',
  'from \'../../../public/js/order': 'from \'@modules/orders/frontend/scripts/order',
  'from "../../../public/js/order': 'from "@modules/orders/frontend/scripts/order',
  'from \'../../../public/js/admin/': 'from \'@modules/admin/frontend/scripts/',
  'from "../../../public/js/admin/': 'from "@modules/admin/frontend/scripts/',

  // Shared components
  'from \'../../../public/js/components/': 'from \'@components/frontend/scripts/',
  'from "../../../public/js/components/': 'from "@components/frontend/scripts/',

  // Shared utilities
  'from \'../../../public/js/utils/': 'from \'@utils/frontend/',
  'from "../../../public/js/utils/': 'from "@utils/frontend/',

  // Shared core
  'from \'../../../public/js/core/': 'from \'@core/frontend/',
  'from "../../../public/js/core/': 'from "@core/frontend/',

  // Backend API
  'from \'../../../src/api/products': 'from \'@modules/products/backend/api/products',
  'from "../../../src/api/products': 'from "@modules/products/backend/api/products',
  'from \'../../../src/api/orders': 'from \'@modules/orders/backend/api/orders',
  'from "../../../src/api/orders': 'from "@modules/orders/backend/api/orders',
  'from \'../../../src/api/admin': 'from \'@modules/admin/backend/api/admin',
  'from "../../../src/api/admin': 'from "@modules/admin/backend/api/admin',
  'from \'../../../src/api/blog': 'from \'@modules/blog/backend/api/blog',
  'from "../../../src/api/blog': 'from "@modules/blog/backend/api/blog',
  'from \'../../../src/api/chat': 'from \'@modules/chat/backend/api/chat',
  'from "../../../src/api/chat': 'from "@modules/chat/backend/api/chat',
  'from \'../../../src/api/forum': 'from \'@modules/forum/backend/api/forum',
  'from "../../../src/api/forum': 'from "@modules/forum/backend/api/forum',
  'from \'../../../src/api/reviews': 'from \'@modules/reviews/backend/api/reviews',
  'from "../../../src/api/reviews': 'from "@modules/reviews/backend/api/reviews',

  // Backend controllers
  'from \'../../../src/controllers/products': 'from \'@modules/products/backend/controllers/products',
  'from "../../../src/controllers/products': 'from "@modules/products/backend/controllers/products',
  'from \'../../../src/controllers/orders': 'from \'@modules/orders/backend/controllers/orders',
  'from "../../../src/controllers/orders': 'from "@modules/orders/backend/controllers/orders',

  // Config
  'from \'../../../src/config/': 'from \'@config/',
  'from "../../../src/config/': 'from "@config/',
};

// Additional patterns for shorter relative paths
const RELATIVE_MAPPINGS = {
  'from \'../../public/js/components/': 'from \'@components/frontend/scripts/',
  'from "../public/js/components/': 'from "@components/frontend/scripts/',
  'from \'../public/js/utils/': 'from \'@utils/frontend/',
  'from "../public/js/utils/': 'from "@utils/frontend/',
};

function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Apply path mappings
    for (const [oldPath, newPath] of Object.entries(PATH_MAPPINGS)) {
      if (content.includes(oldPath)) {
        content = content.split(oldPath).join(newPath);
        updated = true;
      }
    }

    // Apply relative mappings
    for (const [oldPath, newPath] of Object.entries(RELATIVE_MAPPINGS)) {
      if (content.includes(oldPath)) {
        content = content.split(oldPath).join(newPath);
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function walkDirectory(dir, fileCallback) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and hidden directories
      if (file !== 'node_modules' && !file.startsWith('.')) {
        walkDirectory(filePath, fileCallback);
      }
    } else if (file.endsWith('.js')) {
      fileCallback(filePath);
    }
  });
}

function main() {
  console.log('🔄 Starting import path updates...\n');

  const modulesDir = path.join(process.cwd(), 'src', 'modules');
  const sharedDir = path.join(process.cwd(), 'src', 'shared');

  let updatedCount = 0;

  // Update imports in modules
  if (fs.existsSync(modulesDir)) {
    console.log('📁 Updating modules...');
    walkDirectory(modulesDir, (filePath) => {
      if (updateImportsInFile(filePath)) {
        updatedCount++;
      }
    });
  }

  // Update imports in shared
  if (fs.existsSync(sharedDir)) {
    console.log('\n📁 Updating shared resources...');
    walkDirectory(sharedDir, (filePath) => {
      if (updateImportsInFile(filePath)) {
        updatedCount++;
      }
    });
  }

  console.log(`\n✅ Import update complete!`);
  console.log(`📊 Updated ${updatedCount} files`);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { updateImportsInFile, walkDirectory };
