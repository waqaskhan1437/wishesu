-- Create settings table for key-value configuration
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Insert default Whop settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('whop_product_id', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('whop_api_key', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('whop_webhook_secret', '');
