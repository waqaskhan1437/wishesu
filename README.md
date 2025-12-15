# Product Website + Admin (Cloudflare Workers + D1 + R2) — Modular Starter

This is a **foundation-first** scaffold:
- Strict modular structure (each responsibility in its own file)
- Modules communicate through a **Container/Connector**
- RBAC + Auth are **first-class** (no admin routes without roles)

## Apps
- `apps/worker` — Cloudflare Worker API (D1 + R2)
- `apps/admin` — static admin panel (ES Modules, lazy-loaded tabs)

---

## 1) Worker setup

### Prereqs
- Node 18+
- Wrangler

### Install
```bash
cd apps/worker
npm i
```

### Configure Wrangler
Edit `wrangler.toml`:
- D1 database id/name
- R2 bucket name

### Create tables (D1)
```bash
wrangler d1 execute product_db --file=src/core/db/migrations/0001_init.sql
```

### Dev
```bash
wrangler dev
```

### Create first owner user (one-time)
```bash
curl -X POST http://localhost:8787/setup/owner \
  -H "content-type: application/json" \
  -d '{"email":"owner@example.com","password":"ChangeMe123!"}'
```

### Login
```bash
curl -X POST http://localhost:8787/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"owner@example.com","password":"ChangeMe123!"}'
```

---

## 2) Admin setup

This admin is **pure static** (no bundler). It uses ES module lazy-loading for tabs.

### Run a simple static server
From repo root:
```bash
cd apps/admin
npx serve .
```

Open the URL shown by `serve`.

Set API base URL in `apps/admin/src/core/apiClient.js` if needed.

---

## Notes
- Keep files under ~200 lines. Add features as new modules/files.
- Do not import feature modules directly into each other. Use:
  - Worker: `Container`
  - Admin: `Connector`
