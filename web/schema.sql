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
INSERT OR IGNORE INTO app_config (key, value) VALUES ('apiEndpoint', 'https://generativelanguage.googleapis.com/v1beta/openai');
INSERT OR IGNORE INTO app_config (key, value) VALUES ('apiKey', '');
INSERT OR IGNORE INTO app_config (key, value) VALUES ('selectedModel', 'gemini-2.5-flash');
INSERT OR IGNORE INTO app_config (key, value) VALUES ('whisperxEndpoint', '/api/transcribe');

-- Audio files tracking (R2)
CREATE TABLE IF NOT EXISTS audio_files (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  note_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT 'audio/webm',
  r2_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Notes cloud storage
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  key_points TEXT NOT NULL DEFAULT '[]',
  action_items TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  mode TEXT NOT NULL DEFAULT 'thoughts',
  duration INTEGER NOT NULL DEFAULT 0,
  segments TEXT NOT NULL DEFAULT '[]',
  speaker_count INTEGER NOT NULL DEFAULT 0,
  language TEXT DEFAULT 'zh',
  is_processing INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
