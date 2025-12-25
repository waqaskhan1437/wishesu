# Modular Project Structure

## Overview
This project follows a **feature-based modular architecture** where each feature/module contains all its related files (frontend and backend) in a single directory.

## Directory Structure

```
src/
├── modules/              # Feature modules
│   ├── products/        # Product management
│   ├── orders/          # Order processing
│   ├── admin/           # Admin panel
│   ├── blog/            # Blog system
│   ├── chat/            # Chat functionality
│   ├── forum/           # Forum system
│   ├── reviews/         # Review system
│   ├── players/         # Media players
│   ├── page-builder/    # Page builder tool
│   ├── whop/            # Whop integration
│   ├── addons/          # Addons/Extensions
│   ├── auth/            # Authentication
│   ├── payment/         # Payment processing
│   ├── notifications/   # Notifications
│   ├── search/          # Search functionality
│   └── ...              # More modules
│
├── shared/              # Shared resources
│   ├── components/      # Reusable UI components
│   ├── utils/           # Utility functions
│   ├── core/            # Core functionality
│   ├── ui/              # UI elements
│   └── constants/       # Shared constants
│
├── config/              # Configuration files
├── routes/              # Route definitions
└── index.js             # Main entry point
```

## Module Structure

Each module follows this standard structure:

```
module-name/
├── frontend/
│   ├── views/           # HTML templates
│   ├── styles/          # CSS files
│   └── scripts/         # JavaScript files
├── backend/
│   ├── api/             # API routes
│   ├── controllers/     # Business logic
│   └── models/          # Data models (if needed)
└── index.js             # Module entry point
```

## Benefits

1. **Colocation**: Related files are kept together
2. **Scalability**: Easy to add new features
3. **Maintainability**: Changes are localized
4. **Clear Boundaries**: Each module is self-contained
5. **Team Collaboration**: Multiple developers can work on different modules

## Module Categories

### Core Modules
- **products**: Product catalog and management
- **orders**: Order processing and tracking
- **admin**: Admin dashboard and tools
- **auth**: Authentication and authorization
- **payment**: Payment gateway integration

### Content Modules
- **blog**: Blog posts and articles
- **forum**: Discussion forums
- **reviews**: Product reviews and ratings

### Communication Modules
- **chat**: Real-time chat functionality
- **notifications**: Push notifications and alerts

### Utility Modules
- **players**: Audio/Video/Image players
- **page-builder**: Dynamic page creation
- **search**: Search functionality
- **analytics**: Analytics and tracking

### Integration Modules
- **whop**: Whop platform integration
- **addons**: Third-party extensions

## Shared Resources

### Components
Reusable UI components used across modules:
- Header, Footer, Navigation
- Modals, Dialogs, Toasts
- Forms, Buttons, Inputs

### Utils
Common utility functions:
- Date/Time formatting
- Validation helpers
- String manipulation
- API client

### Core
Core application functionality:
- Router
- Event bus
- Middleware
- Error handling

## Adding a New Module

1. Create module directory structure:
   ```bash
   mkdir -p src/modules/new-module/{frontend/{views,styles,scripts},backend/{api,controllers}}
   ```

2. Create `index.js` entry point:
   ```javascript
   // src/modules/new-module/index.js
   export * from './frontend/scripts/main.js';
   export * from './backend/api/api.js';
   ```

3. Add module files in appropriate directories

4. Import module in main application:
   ```javascript
   import * as NewModule from './modules/new-module';
   ```

## Migration Guide

To migrate existing code to this structure:

1. Identify the feature/module the file belongs to
2. Move HTML files to `frontend/views/`
3. Move CSS files to `frontend/styles/`
4. Move client-side JS to `frontend/scripts/`
5. Move backend JS to `backend/api/` or `backend/controllers/`
6. Update import paths

## Best Practices

1. **Keep modules independent**: Avoid tight coupling
2. **Use shared resources**: Don't duplicate code
3. **Follow naming conventions**: Use clear, descriptive names
4. **Document your code**: Add comments and JSDoc
5. **Test each module**: Write unit and integration tests

## Next Steps

- [ ] Phase 1: Create folder structure ✅
- [ ] Phase 2: Migrate existing files
- [ ] Phase 3: Update import paths
- [ ] Phase 4: Test and verify
- [ ] Phase 5: Documentation updates
