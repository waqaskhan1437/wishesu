# 🏗️ ULTRA-MODULAR ARCHITECTURE

## 📐 Core Principles

### 1. **200-Line Rule (STRICT)**
- ❌ No file > 200 lines
- ✅ Split into smaller, focused files
- 🎯 Each file = one responsibility

### 2. **Function Size (STRICT)**
- ❌ No function > 50 lines
- ✅ Break into helper functions
- 🎯 Each function = one task

### 3. **Module Structure (ENFORCED)**

```
apps/worker/src/
├── core/                    # Framework code
│   ├── base/               # Abstract classes (< 150 lines each)
│   │   ├── repository.ts   # Base DB operations
│   │   ├── service.ts      # Base business logic
│   │   └── controller.ts   # Base HTTP handling
│   ├── interfaces.ts       # Type contracts (< 100 lines)
│   ├── validator.ts        # Architecture enforcer (< 150 lines)
│   ├── generator.ts        # Auto-scaffolding (< 200 lines)
│   └── auto-migration.ts   # Smart DB setup (< 200 lines)
│
├── modules/                 # Feature modules
│   ├── loader.ts           # Module registry (< 100 lines)
│   ├── auth/               # Auth module
│   │   ├── index.ts        # Module export (< 50 lines)
│   │   ├── repository.ts   # Data access (< 100 lines)
│   │   ├── service.ts      # Business logic (< 150 lines)
│   │   ├── controller.ts   # HTTP handlers (< 100 lines)
│   │   ├── types.ts        # Interfaces (< 50 lines)
│   │   └── validators.ts   # Validation rules (< 100 lines)
│   │
│   ├── products/           # Products module (same structure)
│   ├── media/              # Media module (same structure)
│   └── [new-module]/       # Auto-generated structure
│
└── index.ts                # Entry point (< 150 lines)
```

## 🎯 File Responsibilities

### Repository (Data Layer)
- **Max: 100 lines**
- **Purpose**: Database queries only
- **No**: Business logic, validation, HTTP handling

### Service (Business Layer)
- **Max: 150 lines**
- **Purpose**: Business rules, validation
- **No**: Database queries, HTTP handling

### Controller (Presentation Layer)
- **Max: 100 lines**
- **Purpose**: HTTP request/response
- **No**: Business logic, database queries

### Types/Interfaces
- **Max: 50 lines**
- **Purpose**: Type definitions only
- **No**: Logic of any kind

### Validators
- **Max: 100 lines**
- **Purpose**: Data validation rules
- **No**: Business logic

## 🚀 Adding New Features

### Step 1: Generate Module Structure
```typescript
import { ModuleGenerator } from "./core/generator";

const module = ModuleGenerator.generate("reviews");
// Creates: repository, service, controller, types, validators
```

### Step 2: Implement Each File
```typescript
// reviews/repository.ts (< 100 lines)
export class ReviewsRepository extends BaseRepository<Review> {
  tableName = "reviews";
  // Custom queries only
}

// reviews/service.ts (< 150 lines)
export class ReviewsService extends BaseService<Review> {
  protected async validate(data: any) {
    // Validation logic
  }
  // Business logic only
}

// reviews/controller.ts (< 100 lines)
export class ReviewsController extends BaseController {
  async handle(request: Request) {
    // HTTP handling only
  }
}
```

### Step 3: Register Module
```typescript
// modules/loader.ts
import { ReviewsModule } from "./reviews";

export function loadModules(container: any) {
  return [
    AuthModule(container),
    ProductsModule(container),
    ReviewsModule(container), // ← Add here
  ];
}
```

## ✅ Validation Rules (Auto-Enforced)

### File Size
```typescript
if (file.lines > 200) {
  throw "File too large! Split into smaller files";
}
```

### Function Size
```typescript
if (function.lines > 50) {
  throw "Function too large! Extract helper functions";
}
```

### Single Responsibility
```typescript
if (file.responsibilities > 1) {
  throw "Mixed concerns! Separate into different files";
}
```

### Proper Structure
```typescript
if (!followsPattern(file)) {
  throw "Wrong structure! Use: repository -> service -> controller";
}
```

## 🎨 Best Practices

### DO ✅
- One file = one responsibility
- Use base classes (DRY)
- Follow layer pattern
- Keep functions small (< 50 lines)
- Keep files small (< 200 lines)
- Use interfaces for contracts
- Separate concerns strictly

### DON'T ❌
- Mix database + business logic
- Put everything in one file
- Create giant functions
- Skip type definitions
- Ignore layer boundaries
- Duplicate code
- Mix concerns

## 📊 Example: Adding "Reviews" Feature

### 1. Repository (70 lines)
```typescript
export class ReviewsRepository extends BaseRepository<Review> {
  tableName = "reviews";
  
  async findByProduct(productId: string) {
    return this.findAll({ product_id: productId });
  }
  
  async getAverageRating(productId: string) {
    const result = await this.db
      .prepare("SELECT AVG(rating) as avg FROM reviews WHERE product_id = ?")
      .bind(productId)
      .first();
    return result?.avg || 0;
  }
}
```

### 2. Service (120 lines)
```typescript
export class ReviewsService extends BaseService<Review> {
  protected async validate(data: any) {
    if (!data.product_id) throw "Product ID required";
    if (!data.rating || data.rating < 1 || data.rating > 5) {
      throw "Rating must be 1-5";
    }
    return data;
  }
  
  async getProductReviews(productId: string) {
    return this.repository.findByProduct(productId);
  }
  
  async getProductRating(productId: string) {
    return this.repository.getAverageRating(productId);
  }
}
```

### 3. Controller (80 lines)
```typescript
export class ReviewsController extends BaseController {
  async handle(request: Request) {
    const url = new URL(request.url);
    
    if (url.pathname.match(/\/reviews\/product\/[^/]+$/)) {
      return this.getByProduct(request);
    }
    
    if (request.method === "POST") {
      return this.create(request);
    }
    
    return this.error("Not found", 404);
  }
  
  private async getByProduct(request: Request) {
    const productId = this.getParams(request, "/reviews/product/:id").id;
    const reviews = await this.service.getProductReviews(productId);
    return this.success(reviews);
  }
  
  private async create(request: Request) {
    const data = await this.parseBody(request);
    const review = await this.service.create(data);
    return this.success(review, 201);
  }
}
```

### 4. Module (40 lines)
```typescript
export function ReviewsModule(container: any) {
  const repo = new ReviewsRepository(container.get("db"));
  const service = new ReviewsService(repo);
  const controller = new ReviewsController(service);
  
  return {
    name: "reviews",
    version: "1.0.0",
    routes: [
      { method: "GET", path: "/reviews/product/:id", handler: (req) => controller.handle(req) },
      { method: "POST", path: "/reviews", handler: (req) => controller.handle(req) }
    ]
  };
}
```

**Total: 310 lines across 4 files** ✅  
**Each file < 200 lines** ✅  
**Clean separation** ✅  

## 🎯 Benefits

1. **Maintainability**: Easy to find and fix code
2. **Testability**: Small units easy to test
3. **Scalability**: Add features without breaking existing
4. **Readability**: Clear structure, clear purpose
5. **Reusability**: Base classes shared across modules
6. **Enforceability**: Architecture validated automatically

## 🚨 Common Violations (Auto-Detected)

### ❌ File Too Large
```
⚠️ products/service.ts: 250 lines (max: 150)
💡 Split into: service.ts + helpers.ts + validators.ts
```

### ❌ Mixed Concerns
```
⚠️ auth/repository.ts: Contains HTTP handling
💡 Move HTTP logic to controller.ts
```

### ❌ No Base Class
```
⚠️ custom-repo.ts: Doesn't extend BaseRepository
💡 Use: class CustomRepo extends BaseRepository<T>
```

## 🎓 Summary

**Ultra-Modular = Ultra-Maintainable**

- Max 200 lines per file
- Max 50 lines per function
- One responsibility per file
- Strict layer separation
- Auto-enforced rules
- Auto-generated scaffolding
