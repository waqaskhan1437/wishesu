# 📐 Project Rules

## Code Structure

### File Size Limits
- **Max 200 lines per file** (STRICT)
- **Max 50 lines per function**
- Split large files into smaller modules

### Layer Separation
- **Repository** - Database queries only (< 100 lines)
- **Service** - Business logic only (< 150 lines)  
- **Controller** - HTTP handling only (< 100 lines)
- **Types** - Interfaces only (< 50 lines)

### Module Structure
```
module-name/
├── index.ts        # Export (< 50 lines)
├── repository.ts   # Data layer (< 100 lines)
├── service.ts      # Business (< 150 lines)
├── controller.ts   # HTTP (< 100 lines)
└── types.ts        # Interfaces (< 50 lines)
```

## Database

### Auto-Migration
- Tables auto-create on first run
- Schema version tracked
- New columns auto-detected
- Zero manual SQL required

### Table Naming
- Singular: `user`, `product`, `media`
- Snake_case for multi-word: `product_media`

## API Design

### Endpoints
- **GET** `/resources` - List all
- **GET** `/resources/:id` - Get one
- **POST** `/resources` - Create
- **PUT** `/resources/:id` - Update
- **DELETE** `/resources/:id` - Delete

### Response Format
```json
{
  "success": true,
  "data": {},
  "error": null
}
```

## Admin Dashboard

### Tabs (5)
1. Basic Info
2. Pricing
3. Media
4. Addons
5. SEO

### Media
- **Galleries** - Multiple named galleries
- **Images** - Upload or URL (mandatory)
- **Videos** - URL + thumbnail (upload/URL)
- **Drag-drop** - Reorder all media

### Addons (8 Types)
1. Heading - Section divider
2. Text - Short input
3. Textarea - Long text
4. Email - Email field
5. File - File upload
6. Radio - Single choice
7. Dropdown - Select list
8. Checkbox - Multiple choice

### Option Features (4)
- **File Upload** - With quantity
- **Text Field** - With label/placeholder
- **Delivery** - Instant + days
- **Default** - Pre-selected (radio)

## Deployment

### Cloudflare Worker
- **Name**: `wishesu1` (no auto PRs)
- **D1 Database**: `product_db`
- **R2 Bucket**: `product-media`
- **Auto-deploy**: GitHub push

### Routes
- `/admin` - Admin dashboard
- `/products` - API endpoints
- `/auth` - Authentication

## Best Practices

### DO ✅
- Keep files small (< 200 lines)
- One responsibility per file
- Use base classes (DRY)
- Modular functions (< 50 lines)
- Clean separation of concerns

### DON'T ❌
- Mix database + business logic
- Create giant files
- Duplicate code
- Skip type definitions
- Hardcode values

## Quick Reference

### Add New Module
1. Create folder: `modules/new-module/`
2. Add files: repository, service, controller, types
3. Register in `modules/loader.ts`
4. Deploy

### Add New Column
1. Edit `auto-migration.ts`
2. Add to `expectedSchema`
3. Deploy
4. Auto-added on next request

### Update Admin
1. Edit `apps/worker/src/admin.html`
2. Keep JavaScript modular
3. Test locally
4. Deploy

---

**Keep it simple. Keep it modular. Keep it clean.**
