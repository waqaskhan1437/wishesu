CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price INTEGER,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'draft',
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS product_media (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  alt TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS product_addons (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price_delta INTEGER DEFAULT 0,
  is_required INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS product_seo (
  product_id TEXT PRIMARY KEY,
  meta_title TEXT,
  meta_description TEXT,
  og_image_r2_key TEXT,
  canonical_url TEXT
);
