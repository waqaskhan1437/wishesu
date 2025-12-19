-- Cloudflare D1 Schema: Customer Data Collection & Notification Workflow

-- chat_sessions: one row per user "session"
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,                 -- uuid
  name TEXT,
  email TEXT,
  created_at INTEGER NOT NULL,         -- unix ms
  last_seen_at INTEGER NOT NULL,       -- unix ms
  first_message_sent INTEGER NOT NULL DEFAULT 0,  -- 0/1 flag for webhook trigger
  metadata TEXT                        -- optional JSON string
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_email ON chat_sessions(email);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at);

-- chat_messages: one row per message
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,                 -- uuid
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,                  -- "user" | "assistant" | "system"
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,         -- unix ms
  client_message_id TEXT,              -- optional id from client for dedupe
  raw_payload TEXT,                    -- optional JSON string (full payload snapshot)
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON chat_messages(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
  ON chat_messages(session_id);
