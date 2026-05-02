-- VoiceMind Multi-User Schema

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by TEXT
);

-- Default admin
INSERT OR IGNORE INTO users (id, email, name, role, status)
VALUES ('admin-1', 'wenyun@gmail.com', 'Wenyun', 'admin', 'active');

-- Default shared config
INSERT OR IGNORE INTO app_config (key, value) VALUES ('apiEndpoint', '');
INSERT OR IGNORE INTO app_config (key, value) VALUES ('apiKey', '');
INSERT OR IGNORE INTO app_config (key, value) VALUES ('selectedModel', 'gemini-2.5-pro');
INSERT OR IGNORE INTO app_config (key, value) VALUES ('whisperxEndpoint', '/api/transcribe');
